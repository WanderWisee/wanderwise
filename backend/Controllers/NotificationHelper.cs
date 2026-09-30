using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using WanderWiseApi.Data;
using WanderWiseApi.Models;

namespace WanderWiseApi.Controllers;

// One place that creates notifications, so every kind follows the
// student's Settings → Notifications checkboxes the same way.
public static class NotificationHelper
{
    // Trip reminders
    public const string TripStart = "trip_start";
    public const string Activity = "activity";
    public const string CheckIn = "checkin";
    // Trip invites
    public const string CrewAdded = "crew_added";
    public const string CrewJoined = "crew_joined";
    public const string CrewRemoved = "crew_removed";
    public const string CrewLeft = "crew_left";
    // Comments
    public const string Comment = "comment";
    // Trip updates (a crew member changed the shared trip)
    public const string TripUpdated = "trip_updated";
    public const string ExpenseAdded = "expense_added";
    public const string BookingAdded = "booking_added";
    public const string BudgetWarning = "budget_80";
    public const string BudgetOver = "budget_over";
    // Trip reminders: the day after a trip ends → write your story
    public const string TripEnded = "trip_ended";
    // Security — always sent, can't be turned off in Settings
    public const string PasswordChanged = "password_changed";

    public static async Task<bool> IsEnabledAsync(WanderWiseDbContext db, int userId, string type)
    {
        var s = await db.UserSettings.FindAsync(userId);
        if (s is null) return true; // no settings saved yet = everything on

        return type switch
        {
            TripStart or Activity or CheckIn or TripEnded => s.NotifTripReminders,
            CrewAdded or CrewJoined or CrewRemoved or CrewLeft => s.NotifTripInvites,
            Comment => s.NotifComments,
            TripUpdated or ExpenseAdded or BookingAdded or BudgetWarning or BudgetOver => s.NotifTripUpdates,
            PasswordChanged => true,
            _ => true,
        };
    }

    // Adds a notification unless the user turned that kind off, or (when
    // refKey is given) the same one already exists.
    public static async Task CreateAsync(
        WanderWiseDbContext db,
        int userId,
        string type,
        string message,
        string? link,
        object data,
        string? refKey = null)
    {
        if (!await IsEnabledAsync(db, userId, type)) return;

        if (refKey != null && await db.Notifications.AnyAsync(n => n.UserId == userId && n.RefKey == refKey))
            return;

        db.Notifications.Add(new Notification
        {
            UserId = userId,
            Type = type,
            Message = message,
            Link = link,
            Data = JsonSerializer.Serialize(data),
            RefKey = refKey,
            IsRead = false,
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();

        // Real push (laptop + phone, even when WanderWise is closed) via
        // OneSignal. Does nothing until the OneSignal keys are in .env.
        await OneSignalPush.SendAsync(userId, message, link);
    }

    // Everyone on a trip: the owner plus every crew member.
    public static async Task<List<int>> TripPeopleAsync(WanderWiseDbContext db, Trip trip)
    {
        var crew = await db.TripMembers
            .Where(m => m.TripId == trip.Id)
            .Select(m => m.UserId)
            .ToListAsync();
        return crew.Append(trip.UserId).Distinct().ToList();
    }

    // Tells everyone on the trip EXCEPT the person who made the change.
    // At most one notification per person, per kind, per trip, per editor
    // every 30 minutes — the trip saves on every little edit, so without
    // this the crew would get dozens of pop-ups.
    public static async Task NotifyTripCrewAsync(
        WanderWiseDbContext db,
        Trip trip,
        int actorId,
        string type,
        string message,
        object data)
    {
        var halfHourBucket = DateTime.UtcNow.Ticks / TimeSpan.FromMinutes(30).Ticks;
        foreach (var userId in await TripPeopleAsync(db, trip))
        {
            if (userId == actorId) continue;
            await CreateAsync(
                db, userId, type, message,
                $"/trip-plan?tripId={trip.Id}",
                data,
                $"{type}:{trip.Id}:{actorId}:{halfHourBucket}");
        }
    }

    // After an expense is added: warn everyone on the trip once when real
    // expenses reach 80% of the budget, and once when they go over it.
    // (Estimated "$ Add Cost" amounts on places don't count — only rows
    // with no placeId, which are the real expenses.) The ref key includes
    // the budget, so raising the budget lets the warning happen again.
    public static async Task CheckBudgetAsync(WanderWiseDbContext db, Trip trip)
    {
        var budget = Convert.ToDecimal(trip.BudgetTotal);
        if (budget <= 0) return;

        var amounts = await db.Expenses
            .Where(e => e.TripId == trip.Id && e.PlaceId == null)
            .Select(e => e.Amount)
            .ToListAsync();
        var spent = amounts.Sum(a => Convert.ToDecimal(a));

        string type;
        if (spent > budget) type = BudgetOver;
        else if (spent >= budget * 0.8m) type = BudgetWarning;
        else return;

        var tripName = trip.Destination ?? trip.Title ?? "";
        var percent = (int)Math.Round(spent / budget * 100);
        var message = type == BudgetOver
            ? $"Your trip to {tripName} is over budget: ₱{spent:N0} of ₱{budget:N0}."
            : $"You've used {percent}% of the budget for {tripName}: ₱{spent:N0} of ₱{budget:N0}.";

        foreach (var userId in await TripPeopleAsync(db, trip))
        {
            await CreateAsync(
                db, userId, type, message,
                $"/trip-plan?tripId={trip.Id}",
                new { tripDestination = tripName, spent = spent.ToString("N0"), budget = budget.ToString("N0"), percent },
                $"{type}:{trip.Id}:{budget}");
        }
    }

    // Trip reminders, for trips you own or joined as crew:
    //  1. Your trip starts today / tomorrow
    //  2. An itinerary place with a set time is coming up within 2 hours
    //  3. A recorded hotel booking checks in today / tomorrow
    //  4. Your trip ended yesterday → write your story in the Journal
    // Each has a ref key, so it's only ever created once.
    public static async Task GenerateTripRemindersAsync(WanderWiseDbContext db, int userId)
    {
        if (!await IsEnabledAsync(db, userId, TripStart)) return;

        var now = DateTime.UtcNow.AddHours(8); // Philippine time (UTC+8, no DST)
        var today = DateOnly.FromDateTime(now);
        var tomorrow = today.AddDays(1);
        var yesterday = today.AddDays(-1);

        var memberTripIds = await db.TripMembers
            .Where(m => m.UserId == userId)
            .Select(m => m.TripId)
            .ToListAsync();

        // Trips happening now, starting tomorrow, or that ended yesterday.
        var trips = await db.Trips
            .Where(t => (t.UserId == userId || memberTripIds.Contains(t.Id))
                        && t.StartDate != null && t.StartDate <= tomorrow
                        && (t.EndDate == null || t.EndDate >= yesterday))
            .ToListAsync();
        if (trips.Count == 0) return;

        foreach (var trip in trips)
        {
            var link = $"/trip-plan?tripId={trip.Id}";
            var tripName = trip.Destination ?? trip.Title ?? "";

            // 4. Trip ended yesterday → invite them to write about it
            if (trip.EndDate == yesterday)
            {
                await CreateAsync(
                    db, userId, TripEnded,
                    $"Your trip to {tripName} is over! Write your story in the Journal.",
                    JournalLink,
                    new { tripDestination = tripName },
                    $"trip_ended:{trip.Id}:{trip.EndDate!.Value:yyyy-MM-dd}");
                continue;
            }

            // 1. Trip starts today / tomorrow
            if (trip.StartDate == today || trip.StartDate == tomorrow)
            {
                var when = trip.StartDate == today ? "today" : "tomorrow";
                await CreateAsync(
                    db, userId, TripStart,
                    $"Your trip to {tripName} starts {when}.",
                    link,
                    new { tripDestination = tripName, when },
                    $"trip_start:{trip.Id}:{trip.StartDate!.Value:yyyy-MM-dd}");
            }

            // 2. Places with a set time within the next 2 hours today
            var nowTime = TimeOnly.FromDateTime(now);
            var soon = nowTime.AddHours(2);
            var places = await db.TripPlaces
                .Where(p => p.TripId == trip.Id && p.ItineraryDate == today && p.ScheduledTime != null)
                .ToListAsync();

            foreach (var place in places)
            {
                var time = place.ScheduledTime!.Value;
                // soon < nowTime means the 2-hour window crosses midnight.
                var inWindow = soon > nowTime
                    ? time >= nowTime && time <= soon
                    : time >= nowTime;
                if (!inWindow) continue;

                await CreateAsync(
                    db, userId, Activity,
                    $"Coming up at {time:HH:mm}: {place.Name} ({tripName}).",
                    link,
                    new { placeName = place.Name, time = time.ToString("HH:mm"), tripDestination = tripName },
                    // Place ids change on every save, so the key uses the
                    // trip, date, time and name instead.
                    $"activity:{trip.Id}:{today:yyyy-MM-dd}:{time:HH:mm}:{place.Name}");
            }

            // 3. Hotel check-in today / tomorrow
            var bookings = await db.TripBookings
                .Where(b => b.TripId == trip.Id)
                .ToListAsync();

            foreach (var booking in bookings)
            {
                var checkIn = DateOnly.FromDateTime(booking.CheckIn);
                if (checkIn != today && checkIn != tomorrow) continue;
                var when = checkIn == today ? "today" : "tomorrow";

                await CreateAsync(
                    db, userId, CheckIn,
                    $"Check-in {when} at {booking.PlaceName} ({tripName}).",
                    link,
                    new { placeName = booking.PlaceName, when, tripDestination = tripName },
                    $"checkin:{booking.Id}:{checkIn:yyyy-MM-dd}");
            }
        }
    }

    // Where "write your story" opens.
    public const string JournalLink = "/journal/new";

    public static string FullName(User? u) =>
        u is null
            ? "Someone"
            : string.Join(" ", new[] { u.FirstName, u.LastName }.Where(s => !string.IsNullOrWhiteSpace(s)));
}
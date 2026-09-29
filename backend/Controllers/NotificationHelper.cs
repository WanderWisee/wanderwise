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
    // Comments
    public const string Comment = "comment";

    public static async Task<bool> IsEnabledAsync(WanderWiseDbContext db, int userId, string type)
    {
        var s = await db.UserSettings.FindAsync(userId);
        if (s is null) return true; // no settings saved yet = everything on

        return type switch
        {
            TripStart or Activity or CheckIn => s.NotifTripReminders,
            CrewAdded or CrewJoined => s.NotifTripInvites,
            Comment => s.NotifComments,
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

    // Three kinds of trip reminder, for trips you own or joined as crew:
    //  1. Your trip starts today / tomorrow
    //  2. An itinerary place with a set time is coming up within 2 hours
    //  3. A recorded hotel booking checks in today / tomorrow
    // Each has a ref key, so it's only ever created once.
    public static async Task GenerateTripRemindersAsync(WanderWiseDbContext db, int userId)
    {
        if (!await IsEnabledAsync(db, userId, TripStart)) return;

        var now = DateTime.UtcNow.AddHours(8); // Philippine time (UTC+8, no DST)
        var today = DateOnly.FromDateTime(now);
        var tomorrow = today.AddDays(1);

        var memberTripIds = await db.TripMembers
            .Where(m => m.UserId == userId)
            .Select(m => m.TripId)
            .ToListAsync();

        // Only trips happening now or starting tomorrow.
        var trips = await db.Trips
            .Where(t => (t.UserId == userId || memberTripIds.Contains(t.Id))
                        && t.StartDate != null && t.StartDate <= tomorrow
                        && (t.EndDate == null || t.EndDate >= today))
            .ToListAsync();
        if (trips.Count == 0) return;

        foreach (var trip in trips)
        {
            var link = $"/trip-plan?tripId={trip.Id}";
            var tripName = trip.Destination ?? trip.Title ?? "";

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

    public static string FullName(User? u) =>
        u is null
            ? "Someone"
            : string.Join(" ", new[] { u.FirstName, u.LastName }.Where(s => !string.IsNullOrWhiteSpace(s)));
}
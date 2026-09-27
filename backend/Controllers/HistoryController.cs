using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WanderWiseApi.Data;

namespace WanderWiseApi.Controllers;

[ApiController]
[Authorize]
public class HistoryController : ControllerBase
{
    private readonly WanderWiseDbContext _db;

    public HistoryController(WanderWiseDbContext db)
    {
        _db = db;
    }

    private int CurrentUserId => int.Parse(User.FindFirstValue(JwtRegisteredClaimNames.Sub)!);

    [HttpGet("/api/history")]
    public async Task<IActionResult> GetHistory()
    {
        var currentUser = await _db.Users.FindAsync(CurrentUserId);
        var currentUserName = currentUser != null
            ? string.Join(" ", new[] { currentUser.FirstName, currentUser.LastName }.Where(s => !string.IsNullOrWhiteSpace(s)))
            : "";

        // Trips you own AND trips you've joined as crew — both should
        // show up in your own History.
        var memberTripIds = await _db.TripMembers
            .Where(m => m.UserId == CurrentUserId)
            .Select(m => m.TripId)
            .ToListAsync();

        // Pull raw columns only here — no string-building inside the SQL
        // query, since EF Core/Pomelo can't translate array + Where +
        // string.Join into SQL. Do that part in memory below instead.
        var tripsRaw = await _db.Trips
            .Where(t => t.UserId == CurrentUserId || memberTripIds.Contains(t.Id))
            .Join(_db.Users, t => t.UserId, u => u.Id, (t, u) => new
            {
                id = t.Id,
                destination = t.Destination,
                title = t.Title,
                updatedAt = t.UpdatedAt,
                startDate = t.StartDate,
                endDate = t.EndDate,
                ownerUserId = t.UserId,
                ownerFirstName = u.FirstName,
                ownerLastName = u.LastName,
            })
            .ToListAsync();

        var tripIds = tripsRaw.Select(t => t.id).ToList();
        var ownerUserIdByTrip = tripsRaw.ToDictionary(t => t.id, t => t.ownerUserId);

        // My own view timestamps for these trips — per-user, so this is
        // MY last-viewed time, not whoever last opened it.
        var myViews = await _db.TripViews
            .Where(v => v.UserId == CurrentUserId && tripIds.Contains(v.TripId))
            .ToDictionaryAsync(v => v.TripId, v => v.ViewedAt);

        // EVERYONE's views on these trips (owner + crew) — this is what
        // lets a History row show "Viewed by: Juan (Today), Maria (Sep 24)"
        // instead of only your own view time.
        var viewsRaw = await _db.TripViews
            .Where(v => tripIds.Contains(v.TripId))
            .Join(_db.Users, v => v.UserId, u => u.Id, (v, u) => new
            {
                tripId = v.TripId,
                userId = v.UserId,
                firstName = u.FirstName,
                lastName = u.LastName,
                viewedAt = v.ViewedAt,
            })
            .ToListAsync();

        // Every viewer, owner included — the owner's own view now shows up
        // here too (tagged "Owner" on the frontend) instead of being
        // folded silently into the Author field with no visible timestamp
        // of their own. This is what lets a crew member's History page
        // show when the OWNER last opened the trip, not just their own.
        var viewedByTrip = viewsRaw
            .GroupBy(v => v.tripId)
            .ToDictionary(
                g => g.Key,
                g => g
                    .OrderByDescending(v => v.viewedAt)
                    .Select(v => new
                    {
                        name = string.Join(" ", new[] { v.firstName, v.lastName }.Where(s => !string.IsNullOrWhiteSpace(s))),
                        viewedAt = v.viewedAt,
                        // Lets the frontend tag YOUR OWN entry in this list
                        // as "(You)".
                        isYou = v.userId == CurrentUserId,
                        // Lets the frontend tag the trip owner's entry as
                        // "(Owner)" instead of "(Invited)" — compared by
                        // userId, not by name, so two people sharing a
                        // name can't get mixed up.
                        isOwner = ownerUserIdByTrip.TryGetValue(g.Key, out var ownerId) && v.userId == ownerId,
                    })
                    .ToList()
            );

        var emptyViewedBy = new List<object>();

        var trips = tripsRaw.Select(t => new
        {
            id = t.id,
            title = !string.IsNullOrWhiteSpace(t.destination) ? "Trip to " + t.destination : (t.title ?? "Untitled trip"),
            type = "Trip",
            // Falls back to the trip's UpdatedAt only if I've never
            // actually opened it yet (e.g. just got added as crew).
            lastViewed = myViews.TryGetValue(t.id, out var viewedAt) ? viewedAt : t.updatedAt,
            // This is YOUR History page, so the prominent name on the row
            // is always YOU — not necessarily the trip's real owner. If
            // you're the owner, that's the same name anyway. If you're
            // crew, the real owner (and anyone else) shows up below in
            // the viewedBy list instead, tagged "Owner"/"Invited".
            author = currentUserName,
            // The actual travel dates (when the trip itself is happening),
            // separate from lastViewed (when someone last opened the page).
            // Sent as plain yyyy-MM-dd — no time-of-day, so no UTC/local
            // conversion issue like the lastViewed timestamps have.
            startDate = t.startDate?.ToString("yyyy-MM-dd"),
            endDate = t.endDate?.ToString("yyyy-MM-dd"),
            // Everyone ELSE who's viewed this trip (owner and/or other
            // crew) — YOUR OWN entry is excluded since you're already the
            // "author" shown above with your own lastViewed time; showing
            // it again here would just be a redundant duplicate.
            viewedBy = viewedByTrip.TryGetValue(t.id, out var viewers)
                ? viewers.Where(v => !v.isYou).Cast<object>().ToList()
                : emptyViewedBy,
        }).ToList();

        // Journal entries stay solo/own-only — not a shared/crew feature,
        // so there's no "viewed by" list here, just an empty one so the
        // shape matches the trips above for Concat below.
        var journals = await _db.JournalEntries
            .Where(j => j.UserId == CurrentUserId)
            .Select(j => new
            {
                id = j.Id,
                title = j.Title ?? "Untitled story",
                type = "Journal",
                lastViewed = j.CreatedAt,
                author = currentUserName,
                // Property order here must match the trips projection
                // above exactly, or the Concat below won't compile (C#
                // treats differently-ordered anonymous types as distinct
                // types even with identical names/types).
                startDate = (string?)null,
                endDate = (string?)null,
                viewedBy = emptyViewedBy,
            })
            .ToListAsync();

        var combined = trips
            .Concat(journals)
            .OrderByDescending(x => x.lastViewed)
            .ToList();

        return Ok(combined);
    }
}
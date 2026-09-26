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

    // Combines the user's Trips and Journal entries into one "history" feed,
    // newest-first. There's no dedicated "last viewed" tracking table yet, so
    // this uses Trip.UpdatedAt (bumped on every autosave in the builder) and
    // JournalEntry.CreatedAt as a stand-in for "last viewed" — close enough
    // for now, and avoids adding a whole extra table + a tracking call on
    // every single page open.
    [HttpGet("/api/history")]
    public async Task<IActionResult> GetHistory()
    {
        var user = await _db.Users.FindAsync(CurrentUserId);
        var authorName = user != null
            ? string.Join(" ", new[] { user.FirstName, user.LastName }.Where(s => !string.IsNullOrWhiteSpace(s)))
            : "";

        var trips = await _db.Trips
            .Where(t => t.UserId == CurrentUserId)
            .Select(t => new {
                id = t.Id,
                title = !string.IsNullOrWhiteSpace(t.Destination) ? "Trip to " + t.Destination : (t.Title ?? "Untitled trip"),
                type = "Trip",
                lastViewed = t.LastViewedAt ?? t.UpdatedAt,
            }).ToListAsync();

        var journals = await _db.JournalEntries
            .Where(j => j.UserId == CurrentUserId)
            .Select(j => new
            {
                id = j.Id,
                title = j.Title ?? "Untitled story",
                type = "Journal",
                lastViewed = j.CreatedAt,
            })
            .ToListAsync();

        var combined = trips
            .Select(t => new { t.id, t.title, t.type, t.lastViewed })
            .Concat(journals.Select(j => new { j.id, j.title, j.type, j.lastViewed }))
            .OrderByDescending(x => x.lastViewed)
            .Select(x => new
            {
                x.id,
                x.title,
                x.type,
                lastViewed = x.lastViewed,
                author = authorName,
            })
            .ToList();

        return Ok(combined);
    }
}
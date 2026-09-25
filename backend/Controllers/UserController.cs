using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WanderWiseApi.Data;

namespace WanderWiseApi.Controllers;

// Powers the "search for a student" feature on the Profile page and the
// public profile view that opens when you tap a search result.
[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly WanderWiseDbContext _db;

    public UsersController(WanderWiseDbContext db)
    {
        _db = db;
    }

    private int CurrentUserId => int.Parse(User.FindFirstValue(JwtRegisteredClaimNames.Sub)!);

    // GET /api/users/search?q=juan
    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string q)
    {
        if (string.IsNullOrWhiteSpace(q))
            return Ok(new List<object>());

        var term = q.Trim();

        var results = await _db.Users
            .Where(u => u.Id != CurrentUserId)
            .Where(u =>
                (u.FirstName != null && u.FirstName.Contains(term)) ||
                (u.LastName != null && u.LastName.Contains(term)))
            .OrderBy(u => u.FirstName)
            .Take(20)
            .Select(u => new
            {
                id = u.Id,
                firstName = u.FirstName,
                lastName = u.LastName,
                avatarUrl = u.AvatarUrl,
            })
            .ToListAsync();

        return Ok(results);
    }

    // GET /api/users/5/public — everything safe to show to another
    // student: no email, no student number, no password.
    [HttpGet("{id:int}/public")]
    public async Task<IActionResult> GetPublicProfile(int id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user is null) return NotFound();

        var trips = await _db.Trips
            .Where(t => t.UserId == id)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new { id = t.Id, destination = t.Destination, title = t.Title })
            .ToListAsync();

        var journalEntries = await _db.JournalEntries
            .Where(j => j.UserId == id)
            .OrderByDescending(j => j.CreatedAt)
            .Select(j => new { id = j.Id, title = j.Title, coverImage = j.CoverImage })
            .ToListAsync();

        // "Places Visited" = unique trip destinations, so it matches what
        // shows up under the Trips tab (not tied to journal wording).
        var placesVisitedCount = trips
            .Select(t => t.destination)
            .Where(d => !string.IsNullOrWhiteSpace(d))
            .Select(d => d!.Trim().ToLowerInvariant())
            .Distinct()
            .Count();

        return Ok(new
        {
            id = user.Id,
            firstName = user.FirstName,
            lastName = user.LastName,
            avatarUrl = user.AvatarUrl,
            bio = user.Bio,
            location = user.Location,
            tripsCount = trips.Count,
            journalPostsCount = journalEntries.Count,
            placesVisitedCount,
            trips,
            journalEntries,
        });
    }
}
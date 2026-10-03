using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WanderWiseApi.Data;
using WanderWiseApi.DTOs;
using WanderWiseApi.Models;

namespace WanderWiseApi.Controllers;

[ApiController]
[Route("api/journal")]
[Authorize]
public class JournalController : ControllerBase
{
    private readonly WanderWiseDbContext _db;

    public JournalController(WanderWiseDbContext db)
    {
        _db = db;
    }

    private int CurrentUserId => int.Parse(User.FindFirstValue(JwtRegisteredClaimNames.Sub)!);

    [HttpGet]
    public async Task<IActionResult> GetMyEntries()
    {
        var entries = await _db.JournalEntries
            .Where(j => j.UserId == CurrentUserId)
            .Include(j => j.Places).ThenInclude(p => p.Pros)
            .Include(j => j.Places).ThenInclude(p => p.Cons)
            .Include(j => j.Places).ThenInclude(p => p.Hotels)
            .OrderByDescending(j => j.CreatedAt)
            .ToListAsync();

        return Ok(entries);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetEntry(int id)
    {
        var entry = await _db.JournalEntries
            .Include(j => j.Places).ThenInclude(p => p.Pros)
            .Include(j => j.Places).ThenInclude(p => p.Cons)
            .Include(j => j.Places).ThenInclude(p => p.Hotels)
            .FirstOrDefaultAsync(j => j.Id == id && j.UserId == CurrentUserId);

        if (entry is null) return NotFound();
        return Ok(entry);
    }

    // Same as GetEntry above, but without the ownership check — used when
    // opening a journal entry from someone else's public profile (or from
    // Guides, once it shows entries from other students too). Read-only.
    [HttpGet("{id:int}/public")]
    public async Task<IActionResult> GetPublicEntry(int id)
    {
        var entry = await _db.JournalEntries
            .Include(j => j.Places).ThenInclude(p => p.Pros)
            .Include(j => j.Places).ThenInclude(p => p.Cons)
            .Include(j => j.Places).ThenInclude(p => p.Hotels)
            .FirstOrDefaultAsync(j => j.Id == id);

        if (entry is null) return NotFound();
        return Ok(entry);
    }

    // Guides → "See Itineraries": every student's journal posts, newest
    // first, with the author's name and small profile picture.
    // With ?q=Baguio, only posts whose title or one of whose places
    // mentions it (MySQL compares case-insensitively).
    [HttpGet("feed")]
    public async Task<IActionResult> GetFeed([FromQuery] string? q, [FromQuery] int limit = 50)
    {
        limit = Math.Clamp(limit, 1, 200);
        var query = _db.JournalEntries.AsQueryable();

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim();
            query = query.Where(j =>
                (j.Title != null && j.Title.Contains(term)) ||
                j.Places.Any(p => p.PlaceName != null && p.PlaceName.Contains(term)));
        }

        var items = await query
            .OrderByDescending(j => j.CreatedAt)
            .Take(limit)
            .Select(j => new
            {
                id = j.Id,
                title = j.Title,
                coverImage = j.CoverImage,
                createdAt = j.CreatedAt,
                placesCount = j.Places.Count,
                commentsCount = _db.JournalComments.Count(c => c.JournalEntryId == j.Id),
                author = new
                {
                    id = j.UserId,
                    firstName = j.User!.FirstName,
                    lastName = j.User.LastName,
                    avatarUrl = j.User.AvatarUrl,
                },
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost]
    public async Task<IActionResult> CreateEntry([FromBody] CreateJournalEntryRequest request)
    {
        var entry = new JournalEntry
        {
            UserId = CurrentUserId,
            Title = request.Title,
            CoverImage = request.CoverImage,
            CreatedAt = DateTime.UtcNow,
            Places = request.Places.Select(p => new JournalEntryPlace
            {
                PlaceName = p.PlaceName,
                ImageUrl = p.ImageUrl,
                Rating = p.Rating,
                Description = p.Description,
                SortOrder = p.SortOrder,
                Pros = p.Pros.Select(t => new JournalEntryPro { Text = t }).ToList(),
                Cons = p.Cons.Select(t => new JournalEntryCon { Text = t }).ToList(),
                Hotels = p.Hotels.Select(h => new JournalEntryHotel { Name = h.Name, Description = h.Description }).ToList(),
            }).ToList(),
        };

        _db.JournalEntries.Add(entry);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetEntry), new { id = entry.Id }, entry);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteEntry(int id)
    {
        var entry = await _db.JournalEntries.FirstOrDefaultAsync(j => j.Id == id && j.UserId == CurrentUserId);
        if (entry is null) return NotFound();

        _db.JournalEntries.Remove(entry);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // --- Comments: on the whole journal entry, not on a specific place ---

    [HttpGet("{id:int}/comments")]
    public async Task<IActionResult> GetComments(int id)
    {
        var comments = await _db.JournalComments
            .Where(c => c.JournalEntryId == id)
            .OrderBy(c => c.CreatedAt)
            .Join(_db.Users, c => c.UserId, u => u.Id, (c, u) => new
            {
                id = c.Id,
                text = c.CommentText,
                createdAt = c.CreatedAt,
                userId = u.Id,
                firstName = u.FirstName,
                lastName = u.LastName,
                avatarUrl = u.AvatarUrl,
            })
            .ToListAsync();

        return Ok(comments);
    }

    [HttpPost("{id:int}/comments")]
    public async Task<IActionResult> AddComment(int id, [FromBody] CreateCommentRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Text))
            return BadRequest("Comment can't be empty.");

        var entry = await _db.JournalEntries.FirstOrDefaultAsync(j => j.Id == id);
        if (entry is null) return NotFound();

        var comment = new JournalComment
        {
            JournalEntryId = id,
            UserId = CurrentUserId,
            CommentText = request.Text.Trim(),
            CreatedAt = DateTime.UtcNow,
        };

        _db.JournalComments.Add(comment);
        await _db.SaveChangesAsync();

        var user = await _db.Users.FindAsync(CurrentUserId);

        // Comments notification for the journal's author (not when you
        // comment on your own post).
        if (entry.UserId != CurrentUserId)
        {
            var commenterName = NotificationHelper.FullName(user);
            var title = string.IsNullOrWhiteSpace(entry.Title) ? "your story" : entry.Title;
            await NotificationHelper.CreateAsync(
                _db, entry.UserId, NotificationHelper.Comment,
                $"{commenterName} commented on {title}.",
                $"/journal/view/{id}",
                new { actorName = commenterName, journalTitle = entry.Title });
        }

        return Ok(new
        {
            id = comment.Id,
            text = comment.CommentText,
            createdAt = comment.CreatedAt,
            userId = user!.Id,
            firstName = user.FirstName,
            lastName = user.LastName,
            avatarUrl = user.AvatarUrl,
        });
    }
}

public class CreateCommentRequest
{
    public string Text { get; set; } = string.Empty;
}
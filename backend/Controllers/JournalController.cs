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
        // Hidden by an admin: only the author can still open it.
        if (entry.IsHidden && entry.UserId != CurrentUserId) return NotFound();
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
        // Posts hidden by an admin (Admin → Journals) never show in Guides.
        var query = _db.JournalEntries.Where(j => !j.IsHidden);

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

    // ---- Limits for a new story (checked on the server, not just the app) ----
    private const int MaxTitle = 150;
    private const int MaxPlaces = 15;
    private const int MaxPlaceName = 150;
    private const int MaxDescription = 2000;
    private const int MaxListItems = 20;      // pros / cons per place
    private const int MaxListItemText = 200;
    private const int MaxHotels = 10;
    private const int MaxHotelName = 150;
    private const int MaxHotelDescription = 1000;
    private const int MaxComment = 1000;
    // One photo as a data URL. The apps shrink photos before sending, so
    // real ones are far smaller; this stops huge or fake "images".
    private const int MaxImageLength = 4_000_000;
    private const int MaxTotalImageLength = 25_000_000;

    private static bool IsAllowedImage(string? value) =>
        string.IsNullOrEmpty(value) ||
        (value.Length <= MaxImageLength &&
         (value.StartsWith("data:image/jpeg;base64,") ||
          value.StartsWith("data:image/png;base64,") ||
          value.StartsWith("data:image/webp;base64,") ||
          value.StartsWith("data:image/gif;base64,") ||
          value.StartsWith("https://")));

    // Returns a message when something is wrong, or null when it's fine.
    private static string? JournalError(CreateJournalEntryRequest r)
    {
        if ((r.Title?.Trim().Length ?? 0) > MaxTitle) return $"Title must be {MaxTitle} characters or less.";
        if (r.Places == null) r.Places = new();
        if (r.Places.Count > MaxPlaces) return $"A story can have up to {MaxPlaces} places.";
        if (!IsAllowedImage(r.CoverImage)) return "Cover photo must be a JPG, PNG, WEBP or GIF image under 3 MB.";

        long totalImages = r.CoverImage?.Length ?? 0;
        foreach (var p in r.Places)
        {
            if ((p.PlaceName?.Trim().Length ?? 0) > MaxPlaceName) return $"Place names must be {MaxPlaceName} characters or less.";
            if ((p.Description?.Length ?? 0) > MaxDescription) return $"Descriptions must be {MaxDescription} characters or less.";
            if (p.Rating > 5) return "Rating must be from 0 to 5 stars.";
            if (!IsAllowedImage(p.ImageUrl)) return "Photos must be JPG, PNG, WEBP or GIF images under 3 MB.";
            totalImages += p.ImageUrl?.Length ?? 0;

            if ((p.Pros?.Count ?? 0) > MaxListItems || (p.Cons?.Count ?? 0) > MaxListItems)
                return $"Up to {MaxListItems} pros and {MaxListItems} cons per place.";
            if ((p.Pros ?? new()).Concat(p.Cons ?? new()).Any(t => t == null || t.Length > MaxListItemText))
                return $"Each pro/con must be {MaxListItemText} characters or less.";

            if ((p.Hotels?.Count ?? 0) > MaxHotels) return $"Up to {MaxHotels} hotels per place.";
            foreach (var h in p.Hotels ?? new())
            {
                if (string.IsNullOrWhiteSpace(h.Name) || h.Name.Length > MaxHotelName)
                    return $"Hotel names are required and must be {MaxHotelName} characters or less.";
                if ((h.Description?.Length ?? 0) > MaxHotelDescription)
                    return $"Hotel descriptions must be {MaxHotelDescription} characters or less.";
            }
        }
        if (totalImages > MaxTotalImageLength) return "Your photos are too large altogether. Use fewer or smaller photos.";
        return null;
    }

    // A story can't be about a trip (or a place in it) that hasn't happened
    // yet: e.g. a trip that starts in December can't get a story in October.
    // Places/destinations that aren't in any of the student's trips are fine.
    private async Task<string?> NotYetVisitedErrorAsync(CreateJournalEntryRequest r)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(8)); // Philippine time
        var memberTripIds = _db.TripMembers.Where(m => m.UserId == CurrentUserId).Select(m => m.TripId);
        var trips = await _db.Trips
            .Where(t => t.UserId == CurrentUserId || memberTripIds.Contains(t.Id))
            .Select(t => new { t.Id, t.Destination, t.StartDate })
            .ToListAsync();
        if (trips.Count == 0) return null;
        var tripIds = trips.Select(t => t.Id).ToList();
        var places = await _db.TripPlaces
            .Where(p => tripIds.Contains(p.TripId))
            .Select(p => new { p.TripId, p.Name, p.ItineraryDate, p.Visited })
            .ToListAsync();

        static string Norm(string? v) => (v ?? "").Trim().ToLowerInvariant();
        bool TripLocked(DateOnly? start) => start.HasValue && start.Value > today;

        // Title "<destination> Travel Story": only trips that have started.
        var title = Norm(r.Title);
        foreach (var suffix in new[] { "travel story", "kwento ng paglalakbay" })
            if (title.EndsWith(suffix)) title = title[..^suffix.Length].Trim();
        var sameDest = trips.Where(t => title.Length > 0 && Norm(t.Destination) == title).ToList();
        if (sameDest.Count > 0 && sameDest.All(t => TripLocked(t.StartDate)))
        {
            var start = sameDest.Min(t => t.StartDate)!.Value;
            return $"Your trip to {sameDest[0].Destination?.Trim()} starts on {start:MMMM d, yyyy}. You can write its story once the trip has started.";
        }

        // Each place: fine if visited, or its day (or its trip's start) has come.
        foreach (var jp in r.Places ?? new())
        {
            var name = Norm(jp.PlaceName);
            if (name.Length == 0) continue;
            var matches = places.Where(p => Norm(p.Name) == name).ToList();
            if (matches.Count == 0) continue;
            var anyDone = matches.Any(p =>
            {
                if (p.Visited) return true;
                var trip = trips.First(t => t.Id == p.TripId);
                if (TripLocked(trip.StartDate)) return false;
                return !p.ItineraryDate.HasValue || p.ItineraryDate.Value <= today;
            });
            if (!anyDone)
                return $"You haven't been to {jp.PlaceName!.Trim()} yet. It's planned for a later date in your trip, so add it to your story after you visit it.";
        }
        return null;
    }

    [HttpPost]
    public async Task<IActionResult> CreateEntry([FromBody] CreateJournalEntryRequest request)
    {
        var problem = JournalError(request);
        if (problem != null) return BadRequest(new { error = problem });
        var notYet = await NotYetVisitedErrorAsync(request);
        if (notYet != null) return BadRequest(new { error = notYet, code = "not_visited_yet" });

        var entry = new JournalEntry
        {
            UserId = CurrentUserId,
            Title = request.Title?.Trim(),
            CoverImage = request.CoverImage,
            CreatedAt = DateTime.UtcNow,
            Places = request.Places.Select(p => new JournalEntryPlace
            {
                PlaceName = p.PlaceName?.Trim(),
                ImageUrl = p.ImageUrl,
                Rating = p.Rating,
                Description = p.Description,
                SortOrder = p.SortOrder,
                Pros = (p.Pros ?? new()).Select(t => new JournalEntryPro { Text = t.Trim() }).ToList(),
                Cons = (p.Cons ?? new()).Select(t => new JournalEntryCon { Text = t.Trim() }).ToList(),
                Hotels = (p.Hotels ?? new()).Select(h => new JournalEntryHotel { Name = h.Name.Trim(), Description = h.Description }).ToList(),
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

    // Journal views aren't tracked (no table for it); this just accepts the
    // call so the app doesn't get a 404.
    [HttpPost("{id:int}/view")]
    public IActionResult RecordView(int id)
    {
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
            return BadRequest(new { error = "Comment can't be empty." });
        if (request.Text.Trim().Length > MaxComment)
            return BadRequest(new { error = $"Comments must be {MaxComment} characters or less." });

        var entry = await _db.JournalEntries.FirstOrDefaultAsync(j => j.Id == id);
        if (entry is null) return NotFound();
        // A story the admin hid can't get new comments (except from its author).
        if (entry.IsHidden && entry.UserId != CurrentUserId) return NotFound();

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
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WanderWiseApi.Data;
using WanderWiseApi.DTOs;
using WanderWiseApi.Models;

namespace WanderWiseApi.Controllers;

[ApiController]
[Authorize]
public class TripsController : ControllerBase
{
    private readonly WanderWiseDbContext _db;

    public TripsController(WanderWiseDbContext db)
    {
        _db = db;
    }

    private int CurrentUserId => int.Parse(User.FindFirstValue(JwtRegisteredClaimNames.Sub)!);

    // A trip is "accessible" to whoever owns it AND to anyone who has
    // joined it as crew — used for viewing/editing the trip itself.
    // Actions that should stay owner-only (delete, remove a crew member,
    // generate the share link) still check trip.UserId == CurrentUserId
    // directly instead of calling this.
    private async Task<Trip?> GetAccessibleTripAsync(int id)
    {
        var trip = await _db.Trips.FirstOrDefaultAsync(t => t.Id == id);
        if (trip is null) return null;
        if (trip.UserId == CurrentUserId) return trip;

        var isMember = await _db.TripMembers.AnyAsync(m => m.TripId == id && m.UserId == CurrentUserId);
        return isMember ? trip : null;
    }

    // Creates a bare trip right after "Let's go" on Trip Planning —
    // the builder page fills it in afterward via PUT.
    [HttpPost("/api/trips")]
    public async Task<IActionResult> CreateTrip([FromBody] SaveTripRequest request)
    {
        var trip = new Trip
        {
            UserId = CurrentUserId,
            Title = request.Title,
            Destination = request.Destination,
            StartDate = ParseDate(request.StartDate),
            EndDate = ParseDate(request.EndDate),
            TravelBuddiesCount = request.TravelBuddiesCount,
            BudgetTotal = request.BudgetTotal,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _db.Trips.Add(trip);
        await _db.SaveChangesAsync();

        return Ok(new { tripId = trip.Id });
    }

    // Full-replace save: wipes this trip's sections/places/costs and
    // rewrites them from what the builder page currently has. Simpler
    // and safer than trying to diff/patch a freeform nested structure.
    // Open to the owner AND any crew member — that's the point of
    // collaboration: everyone added to the trip can edit it.
    [HttpPut("/api/trips/{id}")]
    public async Task<IActionResult> SaveTrip(int id, [FromBody] SaveTripRequest request)
    {
        var trip = await GetAccessibleTripAsync(id);
        if (trip is null) return NotFound();

        trip.Title = request.Title;
        trip.Destination = request.Destination;
        trip.StartDate = ParseDate(request.StartDate);
        trip.EndDate = ParseDate(request.EndDate);
        trip.TravelBuddiesCount = request.TravelBuddiesCount;
        trip.BudgetTotal = request.BudgetTotal;
        trip.UpdatedAt = DateTime.UtcNow;

        var oldPlaceIds = await _db.TripPlaces
            .Where(p => p.TripId == id)
            .Select(p => p.Id)
            .ToListAsync();

        if (oldPlaceIds.Count > 0)
        {
            var oldExpenses = _db.Expenses.Where(e => e.PlaceId != null && oldPlaceIds.Contains(e.PlaceId.Value));
            _db.Expenses.RemoveRange(oldExpenses);
        }

        _db.TripPlaces.RemoveRange(_db.TripPlaces.Where(p => p.TripId == id));
        _db.TripSections.RemoveRange(_db.TripSections.Where(s => s.TripId == id));
        await _db.SaveChangesAsync();

        var sortOrder = 0;
        foreach (var sectionDto in request.Sections)
        {
            int? sectionId = null;
            if (!sectionDto.IsDefault)
            {
                var section = new TripSection
                {
                    TripId = id,
                    Name = sectionDto.Name,
                    SortOrder = sectionDto.SortOrder,
                };
                _db.TripSections.Add(section);
                await _db.SaveChangesAsync();
                sectionId = section.Id;
            }

            foreach (var placeDto in sectionDto.Places)
            {
                var place = new TripPlace
                {
                    TripId = id,
                    SectionId = sectionId,
                    ItineraryDate = ParseDate(placeDto.ItineraryDate),
                    // Position within its itinerary day, so a drag-and-drop
                    // or "Optimize route" reorder survives a refresh.
                    ItineraryOrder = placeDto.ItineraryOrder,
                    Name = placeDto.Name,
                    Latitude = placeDto.Latitude.HasValue ? (decimal)placeDto.Latitude.Value : null,
                    Longitude = placeDto.Longitude.HasValue ? (decimal)placeDto.Longitude.Value : null,
                    Notes = placeDto.Notes,
                    ScheduledTime = ParseTime(placeDto.ScheduledTime),
                    Visited = placeDto.Visited,
                    VisitedAt = placeDto.Visited ? DateTime.UtcNow : null,
                    SortOrder = sortOrder++,
                };
                _db.TripPlaces.Add(place);
                await _db.SaveChangesAsync();

                foreach (var costDto in placeDto.Costs)
                {
                    _db.Expenses.Add(new Expense
                    {
                        TripId = id,
                        PlaceId = place.Id,
                        Category = costDto.Category,
                        Amount = costDto.Amount,
                        CreatedAt = DateTime.UtcNow,
                    });
                }
            }
        }
        await _db.SaveChangesAsync();

        return await GetTrip(id);
    }

    // Open to the owner AND any crew member — a joined collaborator needs
    // to be able to load the trip, not just the person who created it.
    [HttpGet("/api/trips/{id}")]
    public async Task<IActionResult> GetTrip(int id)
    {
        var trip = await GetAccessibleTripAsync(id);
        if (trip is null) return NotFound();

        var sections = await _db.TripSections.Where(s => s.TripId == id).OrderBy(s => s.SortOrder).ToListAsync();
        var places = await _db.TripPlaces.Where(p => p.TripId == id).OrderBy(p => p.SortOrder).ToListAsync();
        var placeIds = places.Select(p => p.Id).ToList();
        var costs = await _db.Expenses.Where(e => e.PlaceId != null && placeIds.Contains(e.PlaceId.Value)).ToListAsync();

        var response = new TripResponse
        {
            Id = trip.Id,
            Title = trip.Title,
            Destination = trip.Destination,
            StartDate = trip.StartDate?.ToString("yyyy-MM-dd"),
            EndDate = trip.EndDate?.ToString("yyyy-MM-dd"),
            TravelBuddiesCount = trip.TravelBuddiesCount,
            BudgetTotal = trip.BudgetTotal,
        };

        response.Sections.Add(new SectionResponse
        {
            IsDefault = true,
            Name = "Where to go?",
            Places = MapPlaces(places.Where(p => p.SectionId == null), costs),
        });

        foreach (var section in sections)
        {
            response.Sections.Add(new SectionResponse
            {
                IsDefault = false,
                Id = section.Id,
                Name = section.Name,
                Places = MapPlaces(places.Where(p => p.SectionId == section.Id), costs),
            });
        }

        return Ok(response);
    }

    // Trips you own, PLUS trips you've joined as crew — so a trip you
    // were added to actually shows up on your own Profile/"Trips" tab,
    // not just for the person who created it.
    [HttpGet("/api/trips")]
    public async Task<IActionResult> GetMyTrips()
    {
        var memberTripIds = await _db.TripMembers
            .Where(m => m.UserId == CurrentUserId)
            .Select(m => m.TripId)
            .ToListAsync();

        var trips = await _db.Trips
            .Where(t => t.UserId == CurrentUserId || memberTripIds.Contains(t.Id))
            .OrderByDescending(t => t.UpdatedAt)
            .Select(t => new
            {
                t.Id,
                t.Title,
                t.Destination,
                t.StartDate,
                t.EndDate,
            })
            .ToListAsync();

        return Ok(trips);
    }

    // Marks THIS trip as viewed BY THIS USER — upserts a per-user row in
    // trip_views, so each person's own "last viewed" is tracked
    // independently instead of one shared timestamp on the trip itself.
    // Open to the owner AND any crew member, same as GetTrip.
    [HttpPost("/api/trips/{id}/view")]
    public async Task<IActionResult> MarkViewed(int id)
    {
        var trip = await GetAccessibleTripAsync(id);
        if (trip is null) return NotFound();

        var existingView = await _db.TripViews
            .FirstOrDefaultAsync(v => v.TripId == id && v.UserId == CurrentUserId);

        if (existingView != null)
        {
            existingView.ViewedAt = DateTime.UtcNow;
        }
        else
        {
            _db.TripViews.Add(new TripView
            {
                TripId = id,
                UserId = CurrentUserId,
                ViewedAt = DateTime.UtcNow,
            });
        }

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // --- Crew (collaboration) ---

    // Returns everyone attached to this trip: the owner (isOwner: true)
    // plus any accounts that joined as crew, either via search-add or via
    // the invite link. Open to the owner AND any crew member, so anyone
    // already on the trip can see who else is on it.
    [HttpGet("/api/trips/{id}/crew")]
    public async Task<IActionResult> GetCrew(int id)
    {
        var trip = await GetAccessibleTripAsync(id);
        if (trip is null) return NotFound();

        var owner = await _db.Users.FindAsync(trip.UserId);

        var members = await _db.TripMembers
            .Where(m => m.TripId == id)
            .Join(_db.Users, m => m.UserId, u => u.Id, (m, u) => new
            {
                id = m.Id,
                userId = u.Id,
                firstName = u.FirstName,
                lastName = u.LastName,
                avatarUrl = u.AvatarUrl,
                joinedAt = m.JoinedAt,
                isOwner = false,
            })
            .ToListAsync();

        var result = new List<object>();
        if (owner != null)
        {
            result.Add(new
            {
                id = 0,
                userId = owner.Id,
                firstName = owner.FirstName,
                lastName = owner.LastName,
                avatarUrl = owner.AvatarUrl,
                joinedAt = trip.CreatedAt,
                isOwner = true,
            });
        }
        result.AddRange(members);

        return Ok(result);
    }

    // Adds an existing student account directly as crew — used by the
    // "search a student by name" flow on the Add Crew page. Open to the
    // owner AND any existing crew member, so any collaborator can bring
    // in more people, not just the original owner. Silently no-ops if
    // they're already crew, so double-clicking "Add" is harmless.
    [HttpPost("/api/trips/{id}/crew")]
    public async Task<IActionResult> AddCrewMember(int id, [FromBody] AddCrewMemberRequest request)
    {
        var trip = await GetAccessibleTripAsync(id);
        if (trip is null) return NotFound();

        if (request.UserId == trip.UserId)
            return BadRequest("This user already owns the trip.");

        var userExists = await _db.Users.AnyAsync(u => u.Id == request.UserId);
        if (!userExists) return NotFound("User not found.");

        var alreadyMember = await _db.TripMembers.AnyAsync(m => m.TripId == id && m.UserId == request.UserId);
        if (alreadyMember) return NoContent();

        _db.TripMembers.Add(new TripMember
        {
            TripId = id,
            UserId = request.UserId,
            JoinedAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();

        // Trip invites notification for the person who was just added.
        var adder = await _db.Users.FindAsync(CurrentUserId);
        var adderName = NotificationHelper.FullName(adder);
        var tripName = trip.Destination ?? trip.Title ?? "";
        await NotificationHelper.CreateAsync(
            _db, request.UserId, NotificationHelper.CrewAdded,
            $"{adderName} added you to the trip to {tripName}.",
            $"/trip-plan?tripId={id}",
            new { actorName = adderName, tripDestination = tripName });

        return NoContent();
    }

    // Removes a crew member — owner-only (a member removing another
    // member, or themselves, is a sharper action best kept to the person
    // who owns the trip). Doesn't touch the owner's own row — there isn't
    // one; the owner is derived from Trip.UserId.
    [HttpDelete("/api/trips/{id}/crew/{memberId}")]
    public async Task<IActionResult> RemoveCrewMember(int id, int memberId)
    {
        var trip = await _db.Trips.FirstOrDefaultAsync(t => t.Id == id && t.UserId == CurrentUserId);
        if (trip is null) return NotFound();

        var member = await _db.TripMembers.FirstOrDefaultAsync(m => m.Id == memberId && m.TripId == id);
        if (member is null) return NotFound();

        _db.TripMembers.Remove(member);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // Generates (once) and returns this trip's share token, used to build
    // the invite/share link shown on the Add Crew page. Owner-only —
    // keeps control of who can (re)create the trip's invite link to the
    // person who owns it. Idempotent — an existing token is just returned
    // as-is instead of rotated.
    [HttpPost("/api/trips/{id}/share-link")]
    public async Task<IActionResult> GetOrCreateShareLink(int id)
    {
        var trip = await _db.Trips.FirstOrDefaultAsync(t => t.Id == id && t.UserId == CurrentUserId);
        if (trip is null) return NotFound();

        if (string.IsNullOrWhiteSpace(trip.ShareToken))
        {
            trip.ShareToken = Guid.NewGuid().ToString("N");
            await _db.SaveChangesAsync();
        }

        return Ok(new { shareToken = trip.ShareToken });
    }

    // Called when a LOGGED-IN user opens an invite link (JoinTripPage on
    // the frontend). Joins them as crew unless they already own the trip
    // or are already a member, then hands back the tripId so the frontend
    // can navigate straight into the Trip Plan Builder.
    [HttpPost("/api/trips/join/{shareToken}")]
    public async Task<IActionResult> JoinByShareToken(string shareToken)
    {
        var trip = await _db.Trips.FirstOrDefaultAsync(t => t.ShareToken == shareToken);
        if (trip is null) return NotFound();

        if (trip.UserId != CurrentUserId)
        {
            var alreadyMember = await _db.TripMembers.AnyAsync(m => m.TripId == trip.Id && m.UserId == CurrentUserId);
            if (!alreadyMember)
            {
                _db.TripMembers.Add(new TripMember
                {
                    TripId = trip.Id,
                    UserId = CurrentUserId,
                    JoinedAt = DateTime.UtcNow,
                });
                await _db.SaveChangesAsync();

                // Trip invites notification for the owner: someone joined
                // through the invite link.
                var joiner = await _db.Users.FindAsync(CurrentUserId);
                var joinerName = NotificationHelper.FullName(joiner);
                var tripName = trip.Destination ?? trip.Title ?? "";
                await NotificationHelper.CreateAsync(
                    _db, trip.UserId, NotificationHelper.CrewJoined,
                    $"{joinerName} joined your trip to {tripName}.",
                    $"/trip-plan?tripId={trip.Id}",
                    new { actorName = joinerName, tripDestination = tripName });
            }
        }

        return Ok(new { tripId = trip.Id });
    }

    // Public, read-only view of a trip via its share link — no login
    // required. This is the "Share Itineraries" case: someone without a
    // WanderWise account can still see the plan, just without edit access
    // and without becoming a TripMember.
    [AllowAnonymous]
    [HttpGet("/api/trips/shared/{shareToken}")]
    public async Task<IActionResult> GetSharedTrip(string shareToken)
    {
        var trip = await _db.Trips.FirstOrDefaultAsync(t => t.ShareToken == shareToken);
        if (trip is null) return NotFound();

        var sections = await _db.TripSections.Where(s => s.TripId == trip.Id).OrderBy(s => s.SortOrder).ToListAsync();
        var places = await _db.TripPlaces.Where(p => p.TripId == trip.Id).OrderBy(p => p.SortOrder).ToListAsync();
        var placeIds = places.Select(p => p.Id).ToList();
        var costs = await _db.Expenses.Where(e => e.PlaceId != null && placeIds.Contains(e.PlaceId.Value)).ToListAsync();

        var response = new TripResponse
        {
            Id = trip.Id,
            Title = trip.Title,
            Destination = trip.Destination,
            StartDate = trip.StartDate?.ToString("yyyy-MM-dd"),
            EndDate = trip.EndDate?.ToString("yyyy-MM-dd"),
            TravelBuddiesCount = trip.TravelBuddiesCount,
            BudgetTotal = trip.BudgetTotal,
        };

        response.Sections.Add(new SectionResponse
        {
            IsDefault = true,
            Name = "Where to go?",
            Places = MapPlaces(places.Where(p => p.SectionId == null), costs),
        });

        foreach (var section in sections)
        {
            response.Sections.Add(new SectionResponse
            {
                IsDefault = false,
                Id = section.Id,
                Name = section.Name,
                Places = MapPlaces(places.Where(p => p.SectionId == section.Id), costs),
            });
        }

        return Ok(response);
    }

    // Deletes a trip and everything that belongs to it — owner-only.
    // Used by the Profile page's "🗑" button on each trip card (also
    // handy for clearing out test/duplicate trips without touching the
    // database directly).
    [HttpDelete("/api/trips/{id}")]
    public async Task<IActionResult> DeleteTrip(int id)
    {
        var trip = await _db.Trips.FirstOrDefaultAsync(t => t.Id == id && t.UserId == CurrentUserId);
        if (trip is null) return NotFound();

        var placeIds = await _db.TripPlaces
            .Where(p => p.TripId == id)
            .Select(p => p.Id)
            .ToListAsync();

        if (placeIds.Count > 0)
        {
            var placeCosts = _db.Expenses.Where(e => e.PlaceId != null && placeIds.Contains(e.PlaceId.Value));
            _db.Expenses.RemoveRange(placeCosts);
        }

        // Any expenses logged straight against the trip (no specific place)
        _db.Expenses.RemoveRange(_db.Expenses.Where(e => e.TripId == id && e.PlaceId == null));

        _db.TripPlaces.RemoveRange(_db.TripPlaces.Where(p => p.TripId == id));
        _db.TripSections.RemoveRange(_db.TripSections.Where(s => s.TripId == id));
        _db.TripMembers.RemoveRange(_db.TripMembers.Where(m => m.TripId == id));

        _db.Trips.Remove(trip);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    private static List<PlaceResponse> MapPlaces(IEnumerable<TripPlace> places, List<Expense> allCosts)
    {
        return places.Select(p => new PlaceResponse
        {
            Id = p.Id,
            Name = p.Name,
            ItineraryDate = p.ItineraryDate?.ToString("yyyy-MM-dd"),
            ItineraryOrder = p.ItineraryOrder,
            Latitude = p.Latitude.HasValue ? (double)p.Latitude.Value : null,
            Longitude = p.Longitude.HasValue ? (double)p.Longitude.Value : null,
            Notes = p.Notes,
            ScheduledTime = p.ScheduledTime?.ToString("HH:mm"),
            Visited = p.Visited,
            Costs = allCosts.Where(c => c.PlaceId == p.Id).Select(c => new CostResponse
            {
                Id = c.Id,
                Category = c.Category,
                Amount = c.Amount,
            }).ToList(),
        }).ToList();
    }

    private static DateOnly? ParseDate(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        return DateOnly.TryParse(raw, out var d) ? d : null;
    }

    private static TimeOnly? ParseTime(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        return TimeOnly.TryParse(raw, out var t) ? t : null;
    }
}
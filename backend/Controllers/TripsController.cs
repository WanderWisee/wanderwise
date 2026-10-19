using System.Globalization;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
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
        if (isMember) return trip;

        // Teachers can OPEN (never edit) trips of students in their classes.
        return await PortalAccess.CanTeacherViewTripAsync(_db, CurrentUserId, id) ? trip : null;
    }

    // "owner", "editor" (crew allowed to edit) or "viewer" (crew, view only).
    // null = not on this trip at all.
    private async Task<string?> GetMyRoleAsync(Trip trip)
    {
        if (trip.UserId == CurrentUserId) return "owner";
        var member = await _db.TripMembers.FirstOrDefaultAsync(m => m.TripId == trip.Id && m.UserId == CurrentUserId);
        if (member is not null) return member.CanEdit ? "editor" : "viewer";
        // Read-only teacher view (see GetAccessibleTripAsync).
        return await PortalAccess.CanTeacherViewTripAsync(_db, CurrentUserId, trip.Id) ? "teacher" : null;
    }

    // Changing the trip (saving, adding crew, the invite link) is only for
    // the owner and crew the owner gave edit access to — viewers can only look.
    private async Task<bool> CanEditTripAsync(Trip trip)
    {
        var role = await GetMyRoleAsync(trip);
        return role == "owner" || role == "editor";
    }

    // Creates a bare trip right after "Let's go" on Trip Planning —
    // the builder page fills it in afterward via PUT.
    [HttpPost("/api/trips")]
    public async Task<IActionResult> CreateTrip([FromBody] SaveTripRequest request)
    {
        // Teachers only review their students' trips; they don't make their own.
        if (await PortalAccess.HasRoleAsync(_db, CurrentUserId, PortalAccess.RoleTeacher))
            return Forbid();

        var invalid = TripError(request);
        if (invalid != null) return BadRequest(new { error = invalid });

        var trip = new Trip
        {
            UserId = CurrentUserId,
            Title = CleanTitle(request.Title),
            TripName = CleanTripName(request.TripName),
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
    // Open to the owner and crew with edit access. View-only crew get 403.
    [HttpPut("/api/trips/{id}")]
    public async Task<IActionResult> SaveTrip(int id, [FromBody] SaveTripRequest request)
    {
        var trip = await GetAccessibleTripAsync(id);
        if (trip is null) return NotFound();
        if (!await CanEditTripAsync(trip)) return Forbid();

        var invalid = TripError(request);
        if (invalid != null) return BadRequest(new { error = invalid });

        // Simultaneous edits: the app sends the version it started from. If
        // a crewmate saved a different plan in the meantime, don't silently
        // overwrite it — the app shows "keep mine / load latest".
        if (!string.IsNullOrWhiteSpace(request.BaseVersion))
        {
            var current = await BuildTripResponseAsync(trip);
            if (current.Version != request.BaseVersion.Trim())
                return Conflict(new { error = "trip_changed", version = current.Version });
        }

        // Snapshot of the trip BEFORE saving, to tell whether anything the
        // crew would care about actually changed (the page also saves when
        // nothing changed, e.g. right after opening a trip).
        var oldPlacesForCompare = await _db.TripPlaces
            .Where(p => p.TripId == id)
            .OrderBy(p => p.SortOrder)
            .ToListAsync();
        var beforeSignature = TripSignature(
            trip.Title, trip.Destination,
            trip.StartDate?.ToString("yyyy-MM-dd"), trip.EndDate?.ToString("yyyy-MM-dd"),
            Convert.ToDecimal(trip.BudgetTotal),
            oldPlacesForCompare.Select(p => PlaceSignature(
                p.Name, p.ItineraryDate?.ToString("yyyy-MM-dd"), p.ItineraryOrder,
                p.ScheduledTime?.ToString("HH:mm"), p.Visited)));

        trip.Title = CleanTitle(request.Title);
        trip.TripName = CleanTripName(request.TripName);
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

        // Trip updates: if something changed, tell the rest of the crew.
        var afterSignature = TripSignature(
            trip.Title, trip.Destination,
            trip.StartDate?.ToString("yyyy-MM-dd"), trip.EndDate?.ToString("yyyy-MM-dd"),
            Convert.ToDecimal(trip.BudgetTotal),
            request.Sections.SelectMany(sec => sec.Places).Select(p => PlaceSignature(
                p.Name, ParseDate(p.ItineraryDate)?.ToString("yyyy-MM-dd"), p.ItineraryOrder,
                ParseTime(p.ScheduledTime)?.ToString("HH:mm"), p.Visited)));

        if (afterSignature != beforeSignature)
        {
            var editor = await _db.Users.FindAsync(CurrentUserId);
            var editorName = NotificationHelper.FullName(editor);
            var tripName = trip.Destination ?? trip.Title ?? "";
            await NotificationHelper.NotifyTripCrewAsync(
                _db, trip, CurrentUserId, NotificationHelper.TripUpdated,
                $"{editorName} updated the trip to {tripName}.",
                new { actorName = editorName, tripDestination = tripName });
        }

        return await GetTrip(id);
    }

    private static string PlaceSignature(string? name, string? date, int? order, string? time, bool visited) =>
        $"{name?.Trim()}|{date}|{order}|{time}|{visited}";

    private static string TripSignature(
        string? title, string? destination, string? start, string? end, decimal budget, IEnumerable<string> places) =>
        $"{title}|{destination}|{start}|{end}|{budget}||" + string.Join("||", places);

    // Open to the owner AND any crew member — a joined collaborator needs
    // to be able to load the trip, not just the person who created it.
    [HttpGet("/api/trips/{id}")]
    public async Task<IActionResult> GetTrip(int id)
    {
        var trip = await GetAccessibleTripAsync(id);
        if (trip is null) return NotFound();

        return Ok(await BuildTripResponseAsync(trip));
    }

    private async Task<TripResponse> BuildTripResponseAsync(Trip trip)
    {
        var id = trip.Id;
        var sections = await _db.TripSections.Where(s => s.TripId == id).OrderBy(s => s.SortOrder).ToListAsync();
        var places = await _db.TripPlaces.Where(p => p.TripId == id).OrderBy(p => p.SortOrder).ToListAsync();
        var placeIds = places.Select(p => p.Id).ToList();
        var costs = await _db.Expenses.Where(e => e.PlaceId != null && placeIds.Contains(e.PlaceId.Value)).ToListAsync();

        var response = new TripResponse
        {
            Id = trip.Id,
            Title = trip.Title,
            TripName = trip.TripName,
            Destination = trip.Destination,
            StartDate = trip.StartDate?.ToString("yyyy-MM-dd"),
            EndDate = trip.EndDate?.ToString("yyyy-MM-dd"),
            TravelBuddiesCount = trip.TravelBuddiesCount,
            BudgetTotal = trip.BudgetTotal,
            MyRole = await GetMyRoleAsync(trip) ?? "viewer",
            IsClassTrip = trip.ClassId != null,
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

        response.Version = ContentVersion(response);
        return response;
    }

    // Short fingerprint of everything the plan contains (not row ids, which
    // change on every full-replace save). Same plan = same version.
    private static string ContentVersion(TripResponse r)
    {
        static string N(object? v) => Convert.ToString(v, CultureInfo.InvariantCulture) ?? "";
        var sb = new StringBuilder();
        sb.Append(N(r.Title)).Append('|').Append(N(r.TripName)).Append('|').Append(N(r.Destination)).Append('|')
          .Append(N(r.StartDate)).Append('|').Append(N(r.EndDate)).Append('|')
          .Append(N(r.TravelBuddiesCount)).Append('|').Append(N(r.BudgetTotal));
        foreach (var sec in r.Sections)
        {
            sb.Append("\n#S").Append(sec.IsDefault).Append('|').Append(N(sec.Name));
            foreach (var p in sec.Places)
            {
                sb.Append("\n#P").Append(N(p.Name)).Append('|').Append(N(p.ItineraryDate)).Append('|')
                  .Append(N(p.ItineraryOrder)).Append('|').Append(N(p.Latitude)).Append('|')
                  .Append(N(p.Longitude)).Append('|').Append(N(p.Notes)).Append('|')
                  .Append(N(p.ScheduledTime)).Append('|').Append(p.Visited);
                foreach (var c in p.Costs)
                    sb.Append("\n#C").Append(N(c.Category)).Append('|').Append(N(c.Amount));
            }
        }
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(sb.ToString()));
        return Convert.ToHexString(hash, 0, 8);
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
                t.TripName,
                t.Destination,
                t.StartDate,
                t.EndDate,
                // Used by Classes → hand in a trip (only your own trips).
                IsOwner = t.UserId == CurrentUserId,
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
                canEdit = m.CanEdit,
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
                canEdit = true,
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
        if (!await CanEditTripAsync(trip)) return Forbid();

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
            CanEdit = false, // view only until the owner allows editing
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

        // Trip invites: tell the person they were removed. No link — they
        // can't open the trip anymore.
        var owner = await _db.Users.FindAsync(CurrentUserId);
        var ownerName = NotificationHelper.FullName(owner);
        var tripName = trip.Destination ?? trip.Title ?? "";
        await NotificationHelper.CreateAsync(
            _db, member.UserId, NotificationHelper.CrewRemoved,
            $"{ownerName} removed you from the trip to {tripName}.",
            null,
            new { actorName = ownerName, tripDestination = tripName });

        return NoContent();
    }

    // Owner-only: lets a crew member edit the trip, or makes them view-only again.
    [HttpPut("/api/trips/{id}/crew/{memberId}/permission")]
    public async Task<IActionResult> SetCrewPermission(int id, int memberId, [FromBody] SetCrewPermissionRequest request)
    {
        var trip = await _db.Trips.FirstOrDefaultAsync(t => t.Id == id && t.UserId == CurrentUserId);
        if (trip is null) return NotFound();

        var member = await _db.TripMembers.FirstOrDefaultAsync(m => m.Id == memberId && m.TripId == id);
        if (member is null) return NotFound();

        member.CanEdit = request.CanEdit;
        await _db.SaveChangesAsync();

        return Ok(new { id = member.Id, canEdit = member.CanEdit });
    }

    // A crew member leaves a trip they joined (the owner can't leave their
    // own trip — they delete it instead). Tells the owner.
    [HttpPost("/api/trips/{id}/leave")]
    public async Task<IActionResult> LeaveTrip(int id)
    {
        var trip = await _db.Trips.FirstOrDefaultAsync(t => t.Id == id);
        if (trip is null) return NotFound();

        var member = await _db.TripMembers.FirstOrDefaultAsync(m => m.TripId == id && m.UserId == CurrentUserId);
        if (member is null) return NotFound();

        // Class field trips are managed by the teacher (students are added
        // and removed together with the class).
        if (trip.ClassId != null)
            return BadRequest(new { error = "This is a class field trip — ask your teacher to remove you." });

        _db.TripMembers.Remove(member);
        await _db.SaveChangesAsync();

        var leaver = await _db.Users.FindAsync(CurrentUserId);
        var leaverName = NotificationHelper.FullName(leaver);
        var tripName = trip.Destination ?? trip.Title ?? "";
        await NotificationHelper.CreateAsync(
            _db, trip.UserId, NotificationHelper.CrewLeft,
            $"{leaverName} left your trip to {tripName}.",
            $"/trip-plan?tripId={trip.Id}",
            new { actorName = leaverName, tripDestination = tripName });

        return NoContent();
    }

    // Generates (once) and returns this trip's share token, used to build
    // the invite/share link shown on the Add Crew page. Open to the owner
    // AND crew members — crew can already add people by name, so they can
    // share the invite link too. Idempotent — an existing token is just
    // returned as-is instead of rotated.
    [HttpPost("/api/trips/{id}/share-link")]
    public async Task<IActionResult> GetOrCreateShareLink(int id)
    {
        var trip = await GetAccessibleTripAsync(id);
        if (trip is null) return NotFound();
        if (!await CanEditTripAsync(trip)) return Forbid();

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
                    CanEdit = false, // view only until the owner allows editing
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
            TripName = trip.TripName,
            Destination = trip.Destination,
            StartDate = trip.StartDate?.ToString("yyyy-MM-dd"),
            EndDate = trip.EndDate?.ToString("yyyy-MM-dd"),
            TravelBuddiesCount = trip.TravelBuddiesCount,
            BudgetTotal = trip.BudgetTotal,
            MyRole = "viewer",
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
        // "Last viewed" rows (History page). Their foreign key has no
        // ON DELETE CASCADE, so a trip anyone had opened couldn't be deleted.
        _db.TripViews.RemoveRange(_db.TripViews.Where(v => v.TripId == id));

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

    // The trip's own name from the builder: trimmed, at most 150 characters;
    // empty means "use Trip to <destination>".
    private static string? CleanTripName(string? raw)
    {
        var name = (raw ?? "").Trim();
        if (name.Length == 0) return null;
        return name.Length > 150 ? name[..150] : name;
    }

    // Server-side check of everything the builder sends. The pages already
    // limit these, but the API can be called directly, so the same limits
    // are enforced here (sizes match the database columns).
    private const decimal MaxMoney = 99_999_999m; // decimal(10,2)
    // Budget and a place's expected costs: up to 1,000,000 with at most
    // 2 decimal places (centavos) — same limit as the web and app forms.
    private const decimal MaxTripMoney = 1_000_000m;
    private static bool HasMoreThanTwoDecimals(decimal v) => decimal.Round(v, 2) != v;
    private const int MaxSections = 100;
    private const int MaxPlaces = 500;
    private const int MaxCostsPerPlace = 50;

    private static string? TripError(SaveTripRequest r)
    {
        if (r is null) return "Trip details are missing.";
        if ((r.Destination ?? "").Trim().Length > 150) return "Destination is too long (max 150 characters).";
        if (r.BudgetTotal < 0 || r.BudgetTotal > MaxTripMoney || HasMoreThanTwoDecimals(r.BudgetTotal)) return "Budget must be between 0 and 1,000,000 (up to 2 decimal places).";
        if (r.TravelBuddiesCount < 0 || r.TravelBuddiesCount > 500) return "Number of people must be between 0 and 500.";

        var start = ParseDate(r.StartDate);
        var end = ParseDate(r.EndDate);
        if (start.HasValue && end.HasValue && end.Value < start.Value) return "End date can't be before the start date.";

        var sections = r.Sections ?? new List<SectionDto>();
        if (sections.Count > MaxSections) return $"Too many lists (max {MaxSections}).";
        var placeCount = 0;
        foreach (var sec in sections)
        {
            if (sec is null) return "A list is empty.";
            if ((sec.Name ?? "").Trim().Length > 100) return "A list name is too long (max 100 characters).";
            var places = sec.Places ?? new List<PlaceDto>();
            placeCount += places.Count;
            if (placeCount > MaxPlaces) return $"Too many places (max {MaxPlaces}).";
            foreach (var pl in places)
            {
                if (pl is null) return "A place is empty.";
                var placeName = (pl.Name ?? "").Trim();
                if (placeName.Length > 150) return "A place name is too long (max 150 characters).";
                if ((pl.Notes ?? "").Length > 5000) return "Notes are too long (max 5,000 characters).";
                if (pl.Latitude is < -90 or > 90 || pl.Longitude is < -180 or > 180) return "A place has an invalid location.";
                var costs = pl.Costs ?? new List<CostDto>();
                if (costs.Count > MaxCostsPerPlace) return $"Too many costs on one place (max {MaxCostsPerPlace}).";
                foreach (var c in costs)
                {
                    if (c is null) return "A cost is empty.";
                    if ((c.Category ?? "").Trim().Length > 50) return "A cost category is too long (max 50 characters).";
                    if (c.Amount < 0 || c.Amount > MaxTripMoney || HasMoreThanTwoDecimals(c.Amount)) return "A cost must be between 0 and 1,000,000 (up to 2 decimal places).";
                }
            }
        }
        return null;
    }

    // trips.title is varchar(100); the pages build it as "Trip to <destination>",
    // so a long destination is cut here instead of failing the save.
    private static string? CleanTitle(string? raw)
    {
        if (raw is null) return null;
        var t = raw.Trim();
        return t.Length > 100 ? t[..100] : t;
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
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
    [HttpPut("/api/trips/{id}")]
    public async Task<IActionResult> SaveTrip(int id, [FromBody] SaveTripRequest request)
    {
        var trip = await _db.Trips.FirstOrDefaultAsync(t => t.Id == id && t.UserId == CurrentUserId);
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

    [HttpGet("/api/trips/{id}")]
    public async Task<IActionResult> GetTrip(int id)
    {
        var trip = await _db.Trips.FirstOrDefaultAsync(t => t.Id == id && t.UserId == CurrentUserId);
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

    [HttpGet("/api/trips")]
    public async Task<IActionResult> GetMyTrips()
    {
        var trips = await _db.Trips
            .Where(t => t.UserId == CurrentUserId)
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

    // Deletes a trip and everything that belongs to it — used by the
    // Profile page's "🗑" button on each trip card (also handy for
    // clearing out test/duplicate trips without touching the database
    // directly).
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
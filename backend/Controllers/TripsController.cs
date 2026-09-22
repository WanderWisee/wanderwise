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
[Route("api/trips")]
[Authorize]
public class TripsController : ControllerBase
{
    private readonly WanderWiseDbContext _db;

    public TripsController(WanderWiseDbContext db)
    {
        _db = db;
    }

    private int CurrentUserId => int.Parse(User.FindFirstValue(JwtRegisteredClaimNames.Sub)!);

    [HttpGet]
    public async Task<IActionResult> GetMyTrips()
    {
        var trips = await _db.Trips
            .Where(t => t.UserId == CurrentUserId)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new
            {
                id = t.Id,
                title = t.Title,
                destination = t.Destination,
                startDate = t.StartDate,
                endDate = t.EndDate,
                travelBuddiesCount = t.TravelBuddiesCount,
                budgetTotal = t.BudgetTotal,
            })
            .ToListAsync();

        return Ok(trips);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetTrip(int id)
    {
        var trip = await _db.Trips
            .Include(t => t.Sections)
            .Include(t => t.Places)
            .Include(t => t.Members)
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == CurrentUserId);

        if (trip is null) return NotFound();
        return Ok(trip);
    }

    [HttpPost]
    public async Task<IActionResult> CreateTrip([FromBody] CreateTripRequest request)
    {
        var trip = new Trip
        {
            UserId = CurrentUserId,
            Title = request.Title,
            Destination = request.Destination,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            TravelBuddiesCount = request.TravelBuddiesCount,
            BudgetTotal = request.BudgetTotal,
            ShareToken = Guid.NewGuid().ToString("N"),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.Trips.Add(trip);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTrip), new { id = trip.Id }, trip);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateTrip(int id, [FromBody] CreateTripRequest request)
    {
        var trip = await _db.Trips.FirstOrDefaultAsync(t => t.Id == id && t.UserId == CurrentUserId);
        if (trip is null) return NotFound();

        trip.Title = request.Title;
        trip.Destination = request.Destination;
        trip.StartDate = request.StartDate;
        trip.EndDate = request.EndDate;
        trip.TravelBuddiesCount = request.TravelBuddiesCount;
        trip.BudgetTotal = request.BudgetTotal;
        trip.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(trip);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteTrip(int id)
    {
        var trip = await _db.Trips.FirstOrDefaultAsync(t => t.Id == id && t.UserId == CurrentUserId);
        if (trip is null) return NotFound();

        _db.Trips.Remove(trip);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{tripId:int}/places")]
    public async Task<IActionResult> AddPlace(int tripId, [FromBody] CreatePlaceRequest request)
    {
        var owns = await _db.Trips.AnyAsync(t => t.Id == tripId && t.UserId == CurrentUserId);
        if (!owns) return NotFound();

        var place = new TripPlace
        {
            TripId = tripId,
            SectionId = request.SectionId,
            ItineraryDate = request.ItineraryDate,
            Name = request.Name,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            Notes = request.Notes,
            Cost = request.Cost,
            SortOrder = request.SortOrder,
        };

        _db.TripPlaces.Add(place);
        await _db.SaveChangesAsync();
        return Ok(place);
    }

    [HttpPut("places/{placeId:int}")]
    public async Task<IActionResult> UpdatePlace(int placeId, [FromBody] UpdatePlaceRequest request)
    {
        var place = await _db.TripPlaces
            .Include(p => p.Trip)
            .FirstOrDefaultAsync(p => p.Id == placeId && p.Trip!.UserId == CurrentUserId);
        if (place is null) return NotFound();

        if (request.Name is not null) place.Name = request.Name;
        if (request.Notes is not null) place.Notes = request.Notes;
        if (request.Cost.HasValue) place.Cost = request.Cost.Value;
        if (request.Visited.HasValue)
        {
            place.Visited = request.Visited.Value;
            place.VisitedAt = request.Visited.Value ? DateTime.UtcNow : null;
        }

        await _db.SaveChangesAsync();
        return Ok(place);
    }

    [HttpDelete("places/{placeId:int}")]
    public async Task<IActionResult> DeletePlace(int placeId)
    {
        var place = await _db.TripPlaces
            .Include(p => p.Trip)
            .FirstOrDefaultAsync(p => p.Id == placeId && p.Trip!.UserId == CurrentUserId);
        if (place is null) return NotFound();

        _db.TripPlaces.Remove(place);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{tripId:int}/members")]
    public async Task<IActionResult> InviteMember(int tripId, [FromBody] InviteMemberRequest request)
    {
        var owns = await _db.Trips.AnyAsync(t => t.Id == tripId && t.UserId == CurrentUserId);
        if (!owns) return NotFound();

        var member = new TripMember
        {
            TripId = tripId,
            InvitedEmailOrName = request.InvitedEmailOrName,
            InvitedAt = DateTime.UtcNow,
        };

        _db.TripMembers.Add(member);
        await _db.SaveChangesAsync();
        return Ok(member);
    }
}

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WanderWiseApi.Data;
using WanderWiseApi.DTOs;
using WanderWiseApi.Models;

namespace WanderWiseApi.Controllers;

[ApiController]
public class DestinationsController : ControllerBase
{
    private readonly WanderWiseDbContext _db;

    public DestinationsController(WanderWiseDbContext db)
    {
        _db = db;
    }

    // Public — no login needed just to see the list of destinations
    // when starting to plan a trip.
    [HttpGet("/api/destinations")]
    public async Task<IActionResult> GetAll()
    {
        var destinations = await _db.Destinations
            .OrderByDescending(d => d.IsFeatured)
            .ThenBy(d => d.Name)
            .Select(d => new
            {
                d.Id,
                d.Name,
                d.Country,
                d.ImageUrl,
                d.IsFeatured,
            })
            .ToListAsync();

        return Ok(destinations);
    }

    // Travel guide sections for one destination (Guides → destination
    // page), managed by the admin in Admin → Destinations & guides.
    // Empty list = no guide written yet (the page then shows its sample).
    [HttpGet("/api/guides")]
    public async Task<IActionResult> GetGuides([FromQuery] string? destination)
    {
        var name = destination?.Trim() ?? "";
        if (name.Length == 0) return Ok(new List<object>());

        var dest = await _db.Destinations.FirstOrDefaultAsync(d => d.Name.ToLower() == name.ToLower());
        if (dest is null) return Ok(new List<object>());

        var guides = await _db.TravelGuides
            .Where(g => g.DestinationId == dest.Id)
            .OrderBy(g => g.SortOrder).ThenBy(g => g.Id)
            .Select(g => new
            {
                id = g.Id,
                pinLabel = g.PinLabel,
                subtitle = g.LocationName,
                description = g.Description,
                pros = g.Pros,
                cons = g.Cons,
                imageUrl = g.ImageUrl,
                hotels = g.HotelOptions.Select(h => new { name = h.HotelName, description = h.Description }).ToList(),
            })
            .ToListAsync();
        return Ok(guides);
    }

    // Called when the user submits a destination that isn't in the
    // dropdown suggestions yet — finds a matching row (case-insensitive),
    // or creates a new one so the list keeps growing over time.
    [HttpPost("/api/destinations/ensure")]
    public async Task<IActionResult> EnsureDestination([FromBody] EnsureDestinationRequest request)
    {
        var name = request.Name?.Trim() ?? "";
        if (string.IsNullOrWhiteSpace(name))
            return BadRequest(new { error = "Destination name is required." });

        var existing = await _db.Destinations
            .FirstOrDefaultAsync(d => d.Name.ToLower() == name.ToLower());

        if (existing is not null)
        {
            return Ok(new
            {
                existing.Id,
                existing.Name,
                existing.Country,
                existing.ImageUrl,
                existing.IsFeatured,
                created = false,
            });
        }

        var newDestination = new Destination
        {
            Name = name,
            Country = "Philippines",
            IsFeatured = false,
        };
        _db.Destinations.Add(newDestination);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            newDestination.Id,
            newDestination.Name,
            newDestination.Country,
            newDestination.ImageUrl,
            newDestination.IsFeatured,
            created = true,
        });
    }
}
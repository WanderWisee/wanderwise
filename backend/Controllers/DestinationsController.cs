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
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WanderWiseApi.Data;
using WanderWiseApi.Models;

namespace WanderWiseApi.Controllers;

public class CreateBookingRequest
{
    public string PlaceName { get; set; } = "";
    public string? BookingSite { get; set; }
    public string? ConfirmationNumber { get; set; }
    public DateTime CheckIn { get; set; }
    public DateTime? CheckOut { get; set; }
}

// "Add my booking": bookings made on Agoda/Klook/etc., recorded by the
// student so they appear on the itinerary. Owner and crew can both see
// and manage them, same rule as ExpensesController.
[ApiController]
[Route("api/trips/{tripId:int}/bookings")]
[Authorize]
public class BookingsController : ControllerBase
{
    private readonly WanderWiseDbContext _db;

    public BookingsController(WanderWiseDbContext db)
    {
        _db = db;
    }

    private int CurrentUserId => int.Parse(User.FindFirstValue(JwtRegisteredClaimNames.Sub)!);

    private async Task<bool> CanAccessTripAsync(int tripId)
    {
        var isOwner = await _db.Trips.AnyAsync(t => t.Id == tripId && t.UserId == CurrentUserId);
        if (isOwner) return true;

        return await _db.TripMembers.AnyAsync(m => m.TripId == tripId && m.UserId == CurrentUserId);
    }

    // Plain shape for the frontend — no Trip navigation property, so the
    // JSON never tries to serialize the whole trip along with it.
    private static object ToDto(TripBooking b) => new
    {
        id = b.Id,
        placeName = b.PlaceName,
        bookingSite = b.BookingSite,
        confirmationNumber = b.ConfirmationNumber,
        checkIn = b.CheckIn.ToString("yyyy-MM-dd"),
        checkOut = b.CheckOut?.ToString("yyyy-MM-dd"),
    };

    [HttpGet]
    public async Task<IActionResult> GetBookings(int tripId)
    {
        if (!await CanAccessTripAsync(tripId)) return NotFound();

        var bookings = await _db.TripBookings
            .Where(b => b.TripId == tripId)
            .OrderBy(b => b.CheckIn)
            .ToListAsync();
        return Ok(bookings.Select(ToDto));
    }

    // Every booking across all trips the student owns or joined as crew —
    // shown on the Hotels page when opened from the navbar. The leading
    // "/" makes this route ignore the controller's trips/{tripId} prefix.
    [HttpGet("/api/bookings/mine")]
    public async Task<IActionResult> GetMyBookings()
    {
        var memberTripIds = await _db.TripMembers
            .Where(m => m.UserId == CurrentUserId)
            .Select(m => m.TripId)
            .ToListAsync();

        var bookings = await _db.TripBookings
            .Include(b => b.Trip)
            .Where(b => b.Trip!.UserId == CurrentUserId || memberTripIds.Contains(b.TripId))
            .OrderBy(b => b.CheckIn)
            .ToListAsync();

        return Ok(bookings.Select(b => new
        {
            id = b.Id,
            tripId = b.TripId,
            // Sent separately so the frontend can say "Trip to" or
            // "Byahe patungong" depending on the chosen language.
            tripDestination = b.Trip?.Destination,
            tripTitle = b.Trip?.Title,
            placeName = b.PlaceName,
            bookingSite = b.BookingSite,
            confirmationNumber = b.ConfirmationNumber,
            checkIn = b.CheckIn.ToString("yyyy-MM-dd"),
            checkOut = b.CheckOut?.ToString("yyyy-MM-dd"),
        }));
    }

    [HttpPost]
    public async Task<IActionResult> AddBooking(int tripId, [FromBody] CreateBookingRequest request)
    {
        if (!await CanAccessTripAsync(tripId)) return NotFound();

        var placeName = (request.PlaceName ?? "").Trim();
        if (placeName.Length == 0)
            return BadRequest(new { message = "Place name is required." });
        if (request.CheckOut.HasValue && request.CheckOut.Value.Date < request.CheckIn.Date)
            return BadRequest(new { message = "Check-out can't be before check-in." });

        var booking = new TripBooking
        {
            TripId = tripId,
            PlaceName = placeName,
            BookingSite = string.IsNullOrWhiteSpace(request.BookingSite) ? null : request.BookingSite.Trim(),
            ConfirmationNumber = string.IsNullOrWhiteSpace(request.ConfirmationNumber) ? null : request.ConfirmationNumber.Trim(),
            CheckIn = request.CheckIn.Date,
            CheckOut = request.CheckOut?.Date,
            CreatedBy = CurrentUserId,
            CreatedAt = DateTime.UtcNow,
        };

        _db.TripBookings.Add(booking);
        await _db.SaveChangesAsync();

        // Trip updates: tell the rest of the crew about the new booking.
        var trip = await _db.Trips.FirstOrDefaultAsync(t => t.Id == tripId);
        if (trip != null)
        {
            var actor = await _db.Users.FindAsync(CurrentUserId);
            var actorName = NotificationHelper.FullName(actor);
            var tripName = trip.Destination ?? trip.Title ?? "";
            await NotificationHelper.NotifyTripCrewAsync(
                _db, trip, CurrentUserId, NotificationHelper.BookingAdded,
                $"{actorName} recorded a booking for {tripName}: {booking.PlaceName}.",
                new { actorName, tripDestination = tripName, placeName = booking.PlaceName });
        }

        return Ok(ToDto(booking));
    }

    [HttpDelete("{bookingId:int}")]
    public async Task<IActionResult> DeleteBooking(int tripId, int bookingId)
    {
        if (!await CanAccessTripAsync(tripId)) return NotFound();

        var booking = await _db.TripBookings.FirstOrDefaultAsync(b => b.Id == bookingId && b.TripId == tripId);
        if (booking is null) return NotFound();

        _db.TripBookings.Remove(booking);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
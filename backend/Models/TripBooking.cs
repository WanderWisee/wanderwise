using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WanderWiseApi.Models;

// A booking the student made OUTSIDE WanderWise (Agoda, Klook, etc.) and
// recorded here with "Add my booking", so it shows up on the right
// itinerary days. WanderWise doesn't book anything itself (see Scope and
// Limitation) — this is the manual side of Booking Synchronization.
[Table("trip_bookings")]
public class TripBooking
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("trip_id")]
    public int TripId { get; set; }

    [Column("place_name")]
    public string PlaceName { get; set; } = "";

    [Column("booking_site")]
    public string? BookingSite { get; set; }

    [Column("confirmation_number")]
    public string? ConfirmationNumber { get; set; }

    [Column("check_in")]
    public DateTime CheckIn { get; set; }

    [Column("check_out")]
    public DateTime? CheckOut { get; set; }

    [Column("created_by")]
    public int CreatedBy { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [ForeignKey(nameof(TripId))]
    public Trip? Trip { get; set; }
}
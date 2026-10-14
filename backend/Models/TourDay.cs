using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WanderWiseApi.Models;

// ===== Tour Day (during the trip) =====
// Everything on the Tour Day page of a trip: per-day meeting point
// (geofence), attendance/check-ins, announcements and activities.

// The meeting point of one itinerary day. Check-ins only count inside
// RadiusMeters of this point (the geofence).
[Table("trip_day_settings")]
public class TripDaySetting
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("trip_id")]
    public int TripId { get; set; }

    [Column("day_date")]
    public DateOnly DayDate { get; set; }

    [Column("meeting_place_name")]
    public string? MeetingPlaceName { get; set; }

    [Column("latitude")]
    public decimal? Latitude { get; set; }

    [Column("longitude")]
    public decimal? Longitude { get; set; }

    [Column("radius_m")]
    public int RadiusMeters { get; set; } = 200;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    [ForeignKey(nameof(TripId))]
    public Trip? Trip { get; set; }
}

// One person's attendance for one day. Present is set by a check-in
// (photo + location inside the geofence) or manually by the owner.
[Table("trip_attendance")]
public class TripAttendance
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("trip_id")]
    public int TripId { get; set; }

    [Column("day_date")]
    public DateOnly DayDate { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("present")]
    public bool Present { get; set; }

    // Check-in proof: photo (data URL), where they were and how far from
    // the meeting point. Null when the owner marked them manually.
    [Column("photo")]
    public string? Photo { get; set; }

    [Column("latitude")]
    public decimal? Latitude { get; set; }

    [Column("longitude")]
    public decimal? Longitude { get; set; }

    [Column("distance_m")]
    public int? DistanceMeters { get; set; }

    [Column("checked_in_at")]
    public DateTime? CheckedInAt { get; set; }

    // Who last changed it (the student for a check-in, or the owner).
    [Column("marked_by")]
    public int? MarkedBy { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    [ForeignKey(nameof(TripId))]
    public Trip? Trip { get; set; }
}

[Table("trip_announcements")]
public class TripAnnouncement
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("trip_id")]
    public int TripId { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("message")]
    public string Message { get; set; } = "";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [ForeignKey(nameof(TripId))]
    public Trip? Trip { get; set; }
}

// Something the group will do on a day, e.g. "Snorkeling" at 10:00 at
// Ariel's Point. Typed by the owner since activities differ per place.
[Table("trip_activities")]
public class TripActivity
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("trip_id")]
    public int TripId { get; set; }

    [Column("day_date")]
    public DateOnly DayDate { get; set; }

    [Column("title")]
    public string Title { get; set; } = "";

    [Column("activity_time")]
    public TimeOnly? ActivityTime { get; set; }

    [Column("place_name")]
    public string? PlaceName { get; set; }

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("created_by")]
    public int CreatedBy { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [ForeignKey(nameof(TripId))]
    public Trip? Trip { get; set; }
}
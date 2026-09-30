using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WanderWiseApi.Models;

// One row per user: which notifications they want, and how dates, times
// and distances should be shown. A user with no row yet just gets the
// defaults (everything on, MM/DD/YYYY, 12-hour, km).
[Table("user_settings")]
public class UserSettings
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.None)]
    [Column("user_id")]
    public int UserId { get; set; }

    [Column("notif_trip_reminders")]
    public bool NotifTripReminders { get; set; } = true;

    [Column("notif_trip_invites")]
    public bool NotifTripInvites { get; set; } = true;

    [Column("notif_comments")]
    public bool NotifComments { get; set; } = true;

    // A crew member changed the trip: itinerary, expenses, bookings, budget.
    [Column("notif_trip_updates")]
    public bool NotifTripUpdates { get; set; } = true;

    [Column("date_format")]
    public string DateFormat { get; set; } = "mdy";

    [Column("time_format")]
    public string TimeFormat { get; set; } = "12h";

    [Column("distance_format")]
    public string DistanceFormat { get; set; } = "km";

    [Column("updated_at")]
    public DateTime? UpdatedAt { get; set; }

    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }
}
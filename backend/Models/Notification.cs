using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WanderWiseApi.Models;

[Table("notifications")]
public class Notification
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    // English fallback text. The frontend builds the real text from Type +
    // Data so it follows the English/Tagalog setting.
    [Column("message")]
    public string Message { get; set; } = string.Empty;

    [Column("is_read")]
    public bool IsRead { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    // trip_start, activity, checkin (Trip reminders) · crew_added,
    // crew_joined (Trip invites) · comment (Comments)
    [Column("type")]
    public string? Type { get; set; }

    // Where clicking the notification takes you, e.g. /trip-plan?tripId=40
    [Column("link")]
    public string? Link { get; set; }

    // JSON with the details (trip name, place, time, who did it).
    [Column("data")]
    public string? Data { get; set; }

    // Stops the same reminder from being created twice.
    [Column("ref_key")]
    public string? RefKey { get; set; }

    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }
}
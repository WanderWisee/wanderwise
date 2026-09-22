using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WanderWiseApi.Models;

[Table("users")]
public class User
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("student_number")]
    public string StudentNumber { get; set; } = string.Empty;

    [Column("date_of_birth")]
    public DateOnly DateOfBirth { get; set; }

    [Column("cellphone_number")]
    public string CellphoneNumber { get; set; } = string.Empty;

    [Column("password_hash")]
    public string PasswordHash { get; set; } = string.Empty;

    [Column("first_name")]
    public string? FirstName { get; set; }

    [Column("last_name")]
    public string? LastName { get; set; }

    [Column("email")]
    public string? Email { get; set; }

    // Personal/backup Gmail — OTP for password reset is sent here, not to
    // the school email, in case the student can't get into the school
    // account.
    [Column("recovery_email")]
    public string? RecoveryEmail { get; set; }

    [Column("avatar_url")]
    public string? AvatarUrl { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    public ICollection<Trip> Trips { get; set; } = new List<Trip>();
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
    public ICollection<JournalEntry> JournalEntries { get; set; } = new List<JournalEntry>();
}

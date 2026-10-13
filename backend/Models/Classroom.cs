using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WanderWiseApi.Models;

// ===== Teacher portal =====
// A teacher's class (e.g. "TOUR 101 · BSTM 3A"). Students get in with the
// join code, or the teacher adds them by student number.
[Table("classes")]
public class SchoolClass
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("teacher_id")]
    public int TeacherId { get; set; }

    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Column("section")]
    public string? Section { get; set; }

    [Column("term")]
    public string? Term { get; set; }

    [Column("join_code")]
    public string JoinCode { get; set; } = string.Empty;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }
}

[Table("class_members")]
public class ClassMember
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("class_id")]
    public int ClassId { get; set; }

    [Column("student_id")]
    public int StudentId { get; set; }

    [Column("joined_at")]
    public DateTime JoinedAt { get; set; }
}

[Table("class_announcements")]
public class ClassAnnouncement
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("class_id")]
    public int ClassId { get; set; }

    [Column("author_id")]
    public int AuthorId { get; set; }

    [Column("message")]
    public string Message { get; set; } = string.Empty;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }
}

// An itinerary task for the class, e.g. "3-day Batangas trip, ₱5,000".
[Table("class_assignments")]
public class ClassAssignment
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("class_id")]
    public int ClassId { get; set; }

    [Column("title")]
    public string Title { get; set; } = string.Empty;

    [Column("instructions")]
    public string? Instructions { get; set; }

    [Column("destination")]
    public string? Destination { get; set; }

    [Column("budget_limit")]
    public decimal? BudgetLimit { get; set; }

    [Column("due_at")]
    public DateTime? DueAt { get; set; }

    [Column("points")]
    public int Points { get; set; } = 100;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }
}

// A student hands in one of their own trips for an assignment.
[Table("assignment_submissions")]
public class AssignmentSubmission
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("assignment_id")]
    public int AssignmentId { get; set; }

    [Column("student_id")]
    public int StudentId { get; set; }

    [Column("trip_id")]
    public int TripId { get; set; }

    [Column("note")]
    public string? Note { get; set; }

    [Column("submitted_at")]
    public DateTime SubmittedAt { get; set; }

    [Column("score")]
    public decimal? Score { get; set; }

    [Column("feedback")]
    public string? Feedback { get; set; }

    [Column("graded_at")]
    public DateTime? GradedAt { get; set; }
}

// ===== Admin panel =====
// One line per important event: logins, sign-ups, approvals, admin
// changes, and server errors — so the admin can trace what went wrong.
[Table("activity_logs")]
public class ActivityLog
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int? UserId { get; set; }

    [Column("action")]
    public string Action { get; set; } = string.Empty;

    [Column("details")]
    public string? Details { get; set; }

    [Column("ip_address")]
    public string? IpAddress { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }
}

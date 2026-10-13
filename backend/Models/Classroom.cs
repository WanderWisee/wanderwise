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

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace WanderWiseApi.Models;

[Table("journal_entries")]
public class JournalEntry
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("title")]
    public string? Title { get; set; }

    [Column("cover_image", TypeName = "LONGTEXT")]
    public string? CoverImage { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    // Hidden by an admin (Admin → Journals). Hidden posts disappear from
    // Guides and public profiles; the author still sees their own.
    [Column("is_hidden")]
    public bool IsHidden { get; set; }

    [Column("hidden_reason")]
    public string? HiddenReason { get; set; }

    [Column("hidden_at")]
    public DateTime? HiddenAt { get; set; }

    [ForeignKey(nameof(UserId))]
    [JsonIgnore]
    public User? User { get; set; }

    public ICollection<JournalEntryPlace> Places { get; set; } = new List<JournalEntryPlace>();
}
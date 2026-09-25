using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace WanderWiseApi.Models;

[Table("journal_comments")]
public class JournalComment
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("journal_entry_id")]
    public int JournalEntryId { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("comment_text")]
    public string CommentText { get; set; } = string.Empty;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [ForeignKey(nameof(JournalEntryId))]
    [JsonIgnore]
    public JournalEntry? JournalEntry { get; set; }

    [ForeignKey(nameof(UserId))]
    [JsonIgnore]
    public User? User { get; set; }
}
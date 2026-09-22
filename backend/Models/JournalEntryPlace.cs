using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WanderWiseApi.Models;

[Table("journal_entry_places")]
public class JournalEntryPlace
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("journal_entry_id")]
    public int JournalEntryId { get; set; }

    [Column("place_name")]
    public string? PlaceName { get; set; }

    [Column("image_url")]
    public string? ImageUrl { get; set; }

    [Column("rating")]
    public byte Rating { get; set; }

    [Column("description")]
    public string? Description { get; set; }

    [Column("sort_order")]
    public int SortOrder { get; set; }

    [ForeignKey(nameof(JournalEntryId))]
    public JournalEntry? JournalEntry { get; set; }

    public ICollection<JournalEntryPro> Pros { get; set; } = new List<JournalEntryPro>();
    public ICollection<JournalEntryCon> Cons { get; set; } = new List<JournalEntryCon>();
    public ICollection<JournalEntryHotel> Hotels { get; set; } = new List<JournalEntryHotel>();
}

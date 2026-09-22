using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WanderWiseApi.Models;

[Table("journal_entry_hotels")]
public class JournalEntryHotel
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("place_id")]
    public int PlaceId { get; set; }

    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Column("description")]
    public string? Description { get; set; }

    [ForeignKey(nameof(PlaceId))]
    public JournalEntryPlace? Place { get; set; }
}

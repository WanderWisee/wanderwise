using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WanderWiseApi.Models;

[Table("journal_entry_pros")]
public class JournalEntryPro
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("place_id")]
    public int PlaceId { get; set; }

    [Column("text")]
    public string Text { get; set; } = string.Empty;

    [ForeignKey(nameof(PlaceId))]
    public JournalEntryPlace? Place { get; set; }
}

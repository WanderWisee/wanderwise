using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace WanderWiseApi.Models;

[Table("journal_entry_cons")]
public class JournalEntryCon
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("place_id")]
    public int PlaceId { get; set; }

    [Column("text")]
    public string Text { get; set; } = string.Empty;

    [ForeignKey(nameof(PlaceId))]
    [JsonIgnore]
    public JournalEntryPlace? Place { get; set; }
}
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WanderWiseApi.Models;

[Table("trip_sections")]
public class TripSection
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("trip_id")]
    public int TripId { get; set; }

    [Column("name")]
    public string? Name { get; set; }

    [Column("sort_order")]
    public int SortOrder { get; set; }

    [ForeignKey(nameof(TripId))]
    public Trip? Trip { get; set; }
}

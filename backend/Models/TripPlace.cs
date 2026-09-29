using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WanderWiseApi.Models;

[Table("trip_places")]
public class TripPlace
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("trip_id")]
    public int TripId { get; set; }

    [Column("section_id")]
    public int? SectionId { get; set; }

    [Column("itinerary_date")]
    public DateOnly? ItineraryDate { get; set; }

     [Column("itinerary_order")]
     public int? ItineraryOrder { get; set; }

    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Column("latitude")]
    public decimal? Latitude { get; set; }

    [Column("longitude")]
    public decimal? Longitude { get; set; }

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("scheduled_time")]
    public TimeOnly? ScheduledTime { get; set; }

    [Column("cost")]
    public decimal Cost { get; set; }

    [Column("sort_order")]
    public int SortOrder { get; set; }

    [Column("visited")]
    public bool Visited { get; set; }

    [Column("visited_at")]
    public DateTime? VisitedAt { get; set; }

    [ForeignKey(nameof(TripId))]
    public Trip? Trip { get; set; }

    [ForeignKey(nameof(SectionId))]
    public TripSection? Section { get; set; }
}

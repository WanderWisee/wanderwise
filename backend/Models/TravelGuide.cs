using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WanderWiseApi.Models;

[Table("travel_guides")]
public class TravelGuide
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("destination_id")]
    public int DestinationId { get; set; }

    [Column("location_name")]
    public string? LocationName { get; set; }

    [Column("pin_label")]
    public string? PinLabel { get; set; }

    [Column("description")]
    public string? Description { get; set; }

    [Column("pros")]
    public string? Pros { get; set; }

    [Column("cons")]
    public string? Cons { get; set; }

    [Column("image_url")]
    public string? ImageUrl { get; set; }

    [Column("map_image_url")]
    public string? MapImageUrl { get; set; }

    [Column("sort_order")]
    public int SortOrder { get; set; }

    [ForeignKey(nameof(DestinationId))]
    public Destination? Destination { get; set; }

    public ICollection<GuideHotelOption> HotelOptions { get; set; } = new List<GuideHotelOption>();
}

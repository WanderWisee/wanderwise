using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WanderWiseApi.Models;

[Table("guide_hotel_options")]
public class GuideHotelOption
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("guide_id")]
    public int GuideId { get; set; }

    [Column("hotel_name")]
    public string? HotelName { get; set; }

    [Column("description")]
    public string? Description { get; set; }

    [Column("star_rating")]
    public byte? StarRating { get; set; }

    [ForeignKey(nameof(GuideId))]
    public TravelGuide? Guide { get; set; }
}

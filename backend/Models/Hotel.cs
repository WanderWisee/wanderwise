using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WanderWiseApi.Models;

[Table("hotels")]
public class Hotel
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("destination_id")]
    public int DestinationId { get; set; }

    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Column("price_per_night")]
    public decimal? PricePerNight { get; set; }

    [Column("amenities")]
    public string? Amenities { get; set; }

    [Column("property_type")]
    public string? PropertyType { get; set; }

    [Column("hotel_class")]
    public byte? HotelClass { get; set; }

    [Column("image_url")]
    public string? ImageUrl { get; set; }

    [Column("latitude")]
    public decimal? Latitude { get; set; }

    [Column("longitude")]
    public decimal? Longitude { get; set; }

    [ForeignKey(nameof(DestinationId))]
    public Destination? Destination { get; set; }
}

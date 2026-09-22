using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WanderWiseApi.Models;

[Table("destinations")]
public class Destination
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Column("country")]
    public string? Country { get; set; }

    [Column("image_url")]
    public string? ImageUrl { get; set; }

    [Column("is_featured")]
    public bool IsFeatured { get; set; }
}

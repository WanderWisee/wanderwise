using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WanderWiseApi.Models;

[Table("trip_members")]
public class TripMember
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("trip_id")]
    public int TripId { get; set; }

    [Column("invited_email_or_name")]
    public string InvitedEmailOrName { get; set; } = string.Empty;

    [Column("invited_at")]
    public DateTime InvitedAt { get; set; }

    [ForeignKey(nameof(TripId))]
    public Trip? Trip { get; set; }
}

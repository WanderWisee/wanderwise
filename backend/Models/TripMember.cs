using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WanderWiseApi.Models;

// A real, account-linked crew member on a trip. Unlike the old version of
// this model, there's no "invited by email/name" text field anymore — the
// group decided that only people with an actual (MSEUF student) WanderWise
// account can become official trip collaborators. Anyone without an
// account can still view a shared trip read-only (see TripsController's
// GetSharedTrip), they just never end up as a row in this table.
[Table("trip_members")]
public class TripMember
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("trip_id")]
    public int TripId { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("joined_at")]
    public DateTime JoinedAt { get; set; }

    [ForeignKey(nameof(TripId))]
    public Trip? Trip { get; set; }

    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }
}
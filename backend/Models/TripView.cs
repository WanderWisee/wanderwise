using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WanderWiseApi.Models;

// One row per (trip, user) pair — tracks when THIS user last viewed THIS
// trip, independently of anyone else. Replaces the old shared
// Trip.LastViewedAt column, which got overwritten by whoever viewed the
// trip last, regardless of who was actually asking.
[Table("trip_views")]
public class TripView
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("trip_id")]
    public int TripId { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("viewed_at")]
    public DateTime ViewedAt { get; set; }

    [ForeignKey(nameof(TripId))]
    public Trip? Trip { get; set; }

    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }
}
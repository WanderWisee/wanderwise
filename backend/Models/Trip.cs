using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WanderWiseApi.Models;

[Table("trips")]
public class Trip
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("title")]
    public string? Title { get; set; }

    [Column("destination")]
    public string? Destination { get; set; }

    [Column("start_date")]
    public DateOnly? StartDate { get; set; }

    [Column("end_date")]
    public DateOnly? EndDate { get; set; }

    [Column("travel_buddies_count")]
    public int TravelBuddiesCount { get; set; }

    [Column("budget_total")]
    public decimal BudgetTotal { get; set; }

    [Column("share_token")]
    public string? ShareToken { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    [Column("last_viewed_at")]
    public DateTime? LastViewedAt { get; set; }

    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }

    public ICollection<TripSection> Sections { get; set; } = new List<TripSection>();
    public ICollection<TripPlace> Places { get; set; } = new List<TripPlace>();
    public ICollection<TripMember> Members { get; set; } = new List<TripMember>();
    public ICollection<Expense> Expenses { get; set; } = new List<Expense>();
}
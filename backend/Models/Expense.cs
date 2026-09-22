using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WanderWiseApi.Models;

// category matches the MySQL ENUM('Food and Drinks','Transit','Activities',
// 'Shopping','Car Rental','Lodging','Gas','Flights') — kept as a plain
// string here since the ENUM values contain spaces and don't map cleanly
// to a C# enum.
[Table("expenses")]
public class Expense
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("trip_id")]
    public int TripId { get; set; }

    [Column("place_id")]
    public int? PlaceId { get; set; }

    [Column("category")]
    public string Category { get; set; } = string.Empty;

    [Column("amount")]
    public decimal Amount { get; set; }

    [Column("description")]
    public string? Description { get; set; }

    [Column("expense_date")]
    public DateOnly? ExpenseDate { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [ForeignKey(nameof(TripId))]
    public Trip? Trip { get; set; }

    [ForeignKey(nameof(PlaceId))]
    public TripPlace? Place { get; set; }
}

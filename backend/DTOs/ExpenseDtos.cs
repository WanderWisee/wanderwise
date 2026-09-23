namespace WanderWiseApi.DTOs;

public class CreateExpenseRequest
{
    public int? PlaceId { get; set; }
    public string Category { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string? Description { get; set; }
    public DateOnly? ExpenseDate { get; set; }
}
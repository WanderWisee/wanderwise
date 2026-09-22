namespace WanderWiseApi.DTOs;

public class CreateTripRequest
{
    public string? Title { get; set; }
    public string? Destination { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public int TravelBuddiesCount { get; set; }
    public decimal BudgetTotal { get; set; }
}

public class CreatePlaceRequest
{
    public int? SectionId { get; set; }
    public DateOnly? ItineraryDate { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public string? Notes { get; set; }
    public decimal Cost { get; set; }
    public int SortOrder { get; set; }
}

public class UpdatePlaceRequest
{
    public string? Name { get; set; }
    public string? Notes { get; set; }
    public decimal? Cost { get; set; }
    public bool? Visited { get; set; }
}

public class InviteMemberRequest
{
    public string InvitedEmailOrName { get; set; } = string.Empty;
}

public class CreateExpenseRequest
{
    public int? PlaceId { get; set; }
    public string Category { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string? Description { get; set; }
    public DateOnly? ExpenseDate { get; set; }
}

namespace WanderWiseApi.DTOs;

public class SaveTripRequest
{
    public string? Title { get; set; }
    public string Destination { get; set; } = string.Empty;
    public string? StartDate { get; set; }   // "yyyy-MM-dd"
    public string? EndDate { get; set; }     // "yyyy-MM-dd"
    public int TravelBuddiesCount { get; set; }
    public decimal BudgetTotal { get; set; }
    public List<SectionDto> Sections { get; set; } = new();
}

public class SectionDto
{
    // true only for the built-in "Where to go?" list — it doesn't get
    // its own trip_sections row, its places just have a NULL section_id.
    public bool IsDefault { get; set; }
    public string? Name { get; set; }
    public int SortOrder { get; set; }
    public List<PlaceDto> Places { get; set; } = new();
}

public class PlaceDto
{
    public string Name { get; set; } = string.Empty;
    public string? ItineraryDate { get; set; }  // "yyyy-MM-dd" or null
    public int? ItineraryOrder { get; set; }    // position within its itinerary day, or null
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? Notes { get; set; }
    public string? ScheduledTime { get; set; }  // "HH:mm" or null
    public bool Visited { get; set; }
    public int SortOrder { get; set; }
    public List<CostDto> Costs { get; set; } = new();
}

public class CostDto
{
    public string Category { get; set; } = string.Empty;
    public decimal Amount { get; set; }
}

public class TripResponse
{
    public int Id { get; set; }
    public string? Title { get; set; }
    public string? Destination { get; set; }
    public string? StartDate { get; set; }
    public string? EndDate { get; set; }
    public int TravelBuddiesCount { get; set; }
    public decimal BudgetTotal { get; set; }
    public List<SectionResponse> Sections { get; set; } = new();
}

public class SectionResponse
{
    public bool IsDefault { get; set; }
    public int? Id { get; set; }
    public string? Name { get; set; }
    public List<PlaceResponse> Places { get; set; } = new();
}

public class PlaceResponse
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ItineraryDate { get; set; }
    public int? ItineraryOrder { get; set; }    // position within its itinerary day, or null
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? Notes { get; set; }
    public string? ScheduledTime { get; set; }
    public bool Visited { get; set; }
    public List<CostResponse> Costs { get; set; } = new();
}

public class CostResponse
{
    public int Id { get; set; }
    public string Category { get; set; } = string.Empty;
    public decimal Amount { get; set; }
}
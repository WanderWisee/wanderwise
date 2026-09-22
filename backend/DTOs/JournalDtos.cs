namespace WanderWiseApi.DTOs;

public class CreateJournalEntryRequest
{
    public string? Title { get; set; }
    public string? CoverImage { get; set; }
    public List<CreateJournalPlaceRequest> Places { get; set; } = new();
}

public class CreateJournalPlaceRequest
{
    public string? PlaceName { get; set; }
    public string? ImageUrl { get; set; }
    public byte Rating { get; set; }
    public string? Description { get; set; }
    public int SortOrder { get; set; }
    public List<string> Pros { get; set; } = new();
    public List<string> Cons { get; set; } = new();
    public List<CreateJournalHotelRequest> Hotels { get; set; } = new();
}

public class CreateJournalHotelRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

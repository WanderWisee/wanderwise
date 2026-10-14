namespace WanderWiseApi.DTOs;

// Bodies for the Tour Day endpoints (TourController).

public class SaveDaySettingRequest
{
    public string Date { get; set; } = "";          // "yyyy-MM-dd"
    public string? MeetingPlaceName { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public int RadiusMeters { get; set; } = 200;
}

public class MarkAttendanceRequest
{
    public string Date { get; set; } = "";
    public int UserId { get; set; }
    public bool Present { get; set; }
}

public class CheckInRequest
{
    public string Date { get; set; } = "";
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string Photo { get; set; } = "";         // data URL (image)
}

public class CreateAnnouncementRequest
{
    public string Message { get; set; } = "";
}

public class CreateActivityRequest
{
    public string Date { get; set; } = "";
    public string Title { get; set; } = "";
    public string? Time { get; set; }               // "HH:mm" or null
    public string? PlaceName { get; set; }
    public string? Notes { get; set; }
}
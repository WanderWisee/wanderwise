namespace WanderWiseApi.DTOs;

// ===== Teacher portal =====
public class SaveClassRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Section { get; set; }
    public string? Term { get; set; }
}

public class AddStudentRequest
{
    // Student number, or the student's school email.
    public string StudentNumber { get; set; } = string.Empty;
}

public class JoinClassRequest
{
    public string Code { get; set; } = string.Empty;
}

public class ClassAnnouncementRequest
{
    public string Message { get; set; } = string.Empty;
}

public class SaveAssignmentRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Instructions { get; set; }
    public string? Destination { get; set; }
    public decimal? BudgetLimit { get; set; }
    // ISO time in UTC (the page converts the teacher's local date-time).
    public string? DueAt { get; set; }
    public int Points { get; set; } = 100;
}

public class SubmitAssignmentRequest
{
    public int TripId { get; set; }
    public string? Note { get; set; }
}

public class GradeSubmissionRequest
{
    public decimal? Score { get; set; }
    public string? Feedback { get; set; }
}

// ===== Admin panel =====
public class SetRoleRequest
{
    public string Role { get; set; } = string.Empty;
}

public class SetStatusRequest
{
    public string Status { get; set; } = string.Empty;
}

public class SetJournalVisibilityRequest
{
    public bool Hidden { get; set; }
    public string? Reason { get; set; }
}

public class SaveDestinationRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Country { get; set; }
    public string? ImageUrl { get; set; }
    public bool IsFeatured { get; set; }
}

public class SaveGuideRequest
{
    public string? LocationName { get; set; }
    public string? PinLabel { get; set; }
    public string? Description { get; set; }
    public string? Pros { get; set; }
    public string? Cons { get; set; }
    public string? ImageUrl { get; set; }
    public string? MapImageUrl { get; set; }
    public int SortOrder { get; set; }
    // One hotel per line: "Hotel name — short description"
    public string? Hotels { get; set; }
}

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

// ===== Admin panel =====
public class SetStatusRequest
{
    public string Status { get; set; } = string.Empty;
}

public class SetJournalVisibilityRequest
{
    public bool Hidden { get; set; }
    public string? Reason { get; set; }
}
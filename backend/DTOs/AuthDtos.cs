namespace WanderWiseApi.DTOs;

public class RegisterSendOtpRequest
{
    public string SchoolEmail { get; set; } = string.Empty;
    public string RecoveryEmail { get; set; } = string.Empty;
}

public class RegisterCompleteRequest
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string SchoolEmail { get; set; } = string.Empty;
    public string RecoveryEmail { get; set; } = string.Empty;
    public string Dob { get; set; } = string.Empty;
    public string Cellphone { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string OtpCode { get; set; } = string.Empty;
}

public class LoginRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    // Which login page sent this: "teacher" (web /teacher/login), "admin"
    // (web /admin/login), or empty/"student" (web /login and the mobile
    // app). Each account type can only log in on its own page.
    public string? Portal { get; set; }
}

public class ForgotPasswordSendOtpRequest
{
    public string SchoolEmail { get; set; } = string.Empty;
}

public class ForgotPasswordResetRequest
{
    public string SchoolEmail { get; set; } = string.Empty;
    public string OtpCode { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

public class AuthResponse
{
    public string Token { get; set; } = string.Empty;
    public int UserId { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Email { get; set; }
    // "student", "teacher" or "admin" — the web app opens the right home page.
    public string Role { get; set; } = "student";
}

// Teacher sign-up (web: /register/teacher). The account starts as
// "pending" until an admin approves it.
public class TeacherSendOtpRequest
{
    public string SchoolEmail { get; set; } = string.Empty;
    public string RecoveryEmail { get; set; } = string.Empty;
    public string EmployeeId { get; set; } = string.Empty;
}

public class TeacherRegisterRequest
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string EmployeeId { get; set; } = string.Empty;
    public string SchoolEmail { get; set; } = string.Empty;
    public string RecoveryEmail { get; set; } = string.Empty;
    public string Dob { get; set; } = string.Empty;
    public string Cellphone { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string OtpCode { get; set; } = string.Empty;
}

public class MeResponse
{
    public int UserId { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Email { get; set; }
    public string? RecoveryEmail { get; set; }
    public string? AvatarUrl { get; set; }
    public string? Bio { get; set; }
    public string? Location { get; set; }
    public string Role { get; set; } = "student";
    public string? StudentNumber { get; set; }
}

// Sent as a base64 data URL (e.g. "data:image/png;base64,....") — the
// browser reads the picked file into this before uploading it.
public class UpdateAvatarRequest
{
    public string AvatarBase64 { get; set; } = string.Empty;
}

// Used by Settings to save bio/location (public profile info).
public class UpdateProfileRequest
{
    public string? Bio { get; set; }
    public string? Location { get; set; }
}
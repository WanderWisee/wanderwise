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
namespace WanderWiseApi.DTOs;

// Step 1 of registration: just the school email, so we can send the OTP
// before collecting the rest of the form.
public class RegisterSendOtpRequest
{
    public string SchoolEmail { get; set; } = string.Empty;
}

// Step 2: everything, plus the OTP the student received.
public class RegisterCompleteRequest
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string SchoolEmail { get; set; } = string.Empty;
    public string RecoveryEmail { get; set; } = string.Empty;
    // Accepts "MM/DD/YYYY" (what the Register page currently sends) or "YYYY-MM-DD".
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

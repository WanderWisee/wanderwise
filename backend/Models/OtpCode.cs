using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WanderWiseApi.Models;

// purpose is "register" (verifying a new school email) or "reset"
// (verifying identity before a password reset).
[Table("otp_codes")]
public class OtpCode
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("email")]
    public string Email { get; set; } = string.Empty;

    [Column("purpose")]
    public string Purpose { get; set; } = string.Empty;

    [Column("code_hash")]
    public string CodeHash { get; set; } = string.Empty;

    [Column("expires_at")]
    public DateTime ExpiresAt { get; set; }

    [Column("consumed_at")]
    public DateTime? ConsumedAt { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }
}

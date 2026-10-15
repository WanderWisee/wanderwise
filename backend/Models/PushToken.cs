using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WanderWiseApi.Models;

// One row per phone that has the WanderWise app (Expo push token).
// A user can have more than one phone; a phone belongs to the account
// that logged in on it last.
[Table("push_tokens")]
public class PushToken
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    // Looks like "ExponentPushToken[xxxxxxxxxxxx]".
    [Column("token")]
    [MaxLength(255)]
    public string Token { get; set; } = string.Empty;

    // "android" or "ios"
    [Column("platform")]
    [MaxLength(20)]
    public string? Platform { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }
}

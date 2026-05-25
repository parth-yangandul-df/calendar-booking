namespace Domain.Entities;

public class RefreshToken
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Token { get; set; } = string.Empty;
    public string JwtId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public ApplicationUser User { get; set; } = null!;
    public bool IsRevoked { get; set; } = false;
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
}

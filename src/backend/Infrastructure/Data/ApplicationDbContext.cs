using Domain.Entities;
using Infrastructure.Data.Configurations;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Data;

public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<RefreshToken> RefreshTokens { get; set; } = null!;
    public DbSet<WeeklyTemplate> WeeklyTemplates { get; set; } = null!;
    public DbSet<AvailabilityOverride> AvailabilityOverrides { get; set; } = null!;
    public DbSet<Booking> Bookings { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfiguration(new RefreshTokenConfiguration());
        builder.ApplyConfiguration(new WeeklyTemplateConfiguration());
        builder.ApplyConfiguration(new AvailabilityOverrideConfiguration());
        builder.ApplyConfiguration(new BookingConfiguration());
    }
}

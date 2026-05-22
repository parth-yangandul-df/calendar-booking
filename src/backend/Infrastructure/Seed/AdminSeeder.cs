using Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CalendarBooking.Infrastructure.Seed;

public static class AdminSeeder
{
    public static async Task SeedAsync(IServiceProvider services, IConfiguration config)
    {
        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();

        var adminEmail = config["AdminSeed:Email"]!;
        if (await userManager.FindByEmailAsync(adminEmail) != null)
            return;

        var admin = new ApplicationUser
        {
            UserName = adminEmail,
            Email = adminEmail,
            IsAdmin = true,
            EmailConfirmed = true
        };

        var password = config["AdminSeed:Password"]!;
        var result = await userManager.CreateAsync(admin, password);

        if (!result.Succeeded)
        {
            throw new Exception(
                $"Failed to seed admin: {string.Join(", ", result.Errors.Select(e => e.Description))}");
        }
    }
}

using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Data.Configurations;

public class WeeklyTemplateConfiguration : IEntityTypeConfiguration<WeeklyTemplate>
{
    public void Configure(EntityTypeBuilder<WeeklyTemplate> builder)
    {
        builder.HasKey(wt => wt.Id);

        builder.HasIndex(wt => new { wt.UserId, wt.DayOfWeek });

        builder.Property(wt => wt.StartTime)
               .HasColumnType("time");

        builder.Property(wt => wt.EndTime)
               .HasColumnType("time");

        builder.HasOne(wt => wt.User)
               .WithMany()
               .HasForeignKey(wt => wt.UserId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}

using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Data.Configurations;

public class AvailabilityOverrideConfiguration : IEntityTypeConfiguration<AvailabilityOverride>
{
    public void Configure(EntityTypeBuilder<AvailabilityOverride> builder)
    {
        builder.HasKey(ao => ao.Id);

        builder.HasIndex(ao => new { ao.UserId, ao.Date });

        builder.Property(ao => ao.Date)
               .HasColumnType("date");

        builder.Property(ao => ao.StartTime)
               .HasColumnType("time");

        builder.Property(ao => ao.EndTime)
               .HasColumnType("time");

        builder.HasOne(ao => ao.User)
               .WithMany()
               .HasForeignKey(ao => ao.UserId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}

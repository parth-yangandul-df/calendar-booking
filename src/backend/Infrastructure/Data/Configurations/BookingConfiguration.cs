using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Data.Configurations;

public class BookingConfiguration : IEntityTypeConfiguration<Booking>
{
    public void Configure(EntityTypeBuilder<Booking> builder)
    {
        builder.ToTable("Bookings");
        builder.HasKey(b => b.Id);

        builder.Property(b => b.OwnerId)
               .IsRequired()
               .HasMaxLength(450);

        builder.Property(b => b.BookerId)
               .IsRequired()
               .HasMaxLength(450);

        builder.Property(b => b.Date)
               .HasColumnType("date");

        builder.Property(b => b.StartTime)
               .HasColumnType("time");

        builder.Property(b => b.EndTime)
               .HasColumnType("time");

        builder.Property(b => b.Status)
               .HasConversion<int>();

        builder.Property(b => b.MeetUrl)
               .HasMaxLength(500);

        builder.Property(b => b.GoogleEventId)
               .HasMaxLength(500);

        builder.Property(b => b.CancelledAt)
               .HasColumnType("datetime2");

        builder.Property(b => b.CreatedAt)
               .IsRequired()
               .HasColumnType("datetime2");

        // Do NOT add FK constraints to ApplicationUser to avoid cascade delete complexity
        builder.Ignore(b => b.Owner);
        builder.Ignore(b => b.Booker);
    }
}

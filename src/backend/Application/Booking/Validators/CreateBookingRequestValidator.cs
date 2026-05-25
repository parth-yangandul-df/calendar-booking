using CalendarBooking.Application.Booking.DTOs;
using FluentValidation;

namespace CalendarBooking.Application.Booking.Validators;

public class CreateBookingRequestValidator : AbstractValidator<CreateBookingRequest>
{
    public CreateBookingRequestValidator()
    {
        RuleFor(x => x.OwnerId).NotEmpty();

        RuleFor(x => x.Date)
            .NotEmpty()
            .Matches(@"^\d{4}-\d{2}-\d{2}$").WithMessage("Date must be in yyyy-MM-dd format");

        RuleFor(x => x.StartTime)
            .NotEmpty()
            .Matches(@"^\d{2}:\d{2}$").WithMessage("StartTime must be in HH:mm format");

        RuleFor(x => x.EndTime)
            .NotEmpty()
            .Matches(@"^\d{2}:\d{2}$").WithMessage("EndTime must be in HH:mm format");

        RuleFor(x => x)
            .Must(x =>
            {
                if (!TimeOnly.TryParse(x.StartTime, out var start) ||
                    !TimeOnly.TryParse(x.EndTime, out var end))
                    return false;
                return start < end;
            })
            .WithName("StartTime")
            .WithMessage("StartTime must be before EndTime");
    }
}

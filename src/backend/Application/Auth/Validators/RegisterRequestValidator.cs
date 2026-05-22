using CalendarBooking.Application.Auth.DTOs;
using FluentValidation;

namespace CalendarBooking.Application.Auth.Validators;

public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty()
            .EmailAddress();

        RuleFor(x => x.Password)
            .NotEmpty()
            .MinimumLength(8)
            .Matches("[a-z]").WithMessage("Password must contain a lowercase letter")
            .Matches("[A-Z]").WithMessage("Password must contain an uppercase letter")
            .Matches("[0-9]").WithMessage("Password must contain a digit");

        RuleFor(x => x.ConfirmPassword)
            .Equal(x => x.Password)
            .WithMessage("Passwords do not match");
    }
}

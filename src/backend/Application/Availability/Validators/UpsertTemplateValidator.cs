using CalendarBooking.Application.Availability.DTOs;
using FluentValidation;

namespace CalendarBooking.Application.Availability.Validators;

public class UpsertTemplateValidator : AbstractValidator<UpsertTemplateRequest>
{
    private static readonly System.Text.RegularExpressions.Regex TimeRegex =
        new(@"^\d{2}:\d{2}$", System.Text.RegularExpressions.RegexOptions.Compiled);

    private static readonly HashSet<string> ValidDays =
        new(Enum.GetNames<DayOfWeek>(), StringComparer.OrdinalIgnoreCase);

    public UpsertTemplateValidator()
    {
        RuleFor(x => x.Items)
            .NotNull()
            .Must(items => items.Select(i => i.DayOfWeek).Distinct(StringComparer.OrdinalIgnoreCase).Count() == items.Count)
            .WithMessage("Duplicate days are not allowed in the template.");

        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.DayOfWeek)
                .NotEmpty()
                .Must(d => ValidDays.Contains(d))
                .WithMessage("DayOfWeek must be a valid day name (Sunday through Saturday).");

            item.RuleFor(i => i.Start)
                .NotEmpty()
                .Matches(TimeRegex)
                .WithMessage("Start must be in HH:mm format.");

            item.RuleFor(i => i.End)
                .NotEmpty()
                .Matches(TimeRegex)
                .WithMessage("End must be in HH:mm format.");

            item.RuleFor(i => i)
                .Must(i => TimeOnly.TryParse(i.Start, out var s) &&
                           TimeOnly.TryParse(i.End, out var e) && s < e)
                .WithMessage("Start time must be before End time.");
        });
    }
}

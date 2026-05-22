using CalendarBooking.Application.Availability.DTOs;
using FluentValidation;

namespace CalendarBooking.Application.Availability.Validators;

public class UpsertOverrideValidator : AbstractValidator<UpsertOverrideRequest>
{
    private static readonly System.Text.RegularExpressions.Regex DateRegex =
        new(@"^\d{4}-\d{2}-\d{2}$", System.Text.RegularExpressions.RegexOptions.Compiled);

    private static readonly System.Text.RegularExpressions.Regex TimeRegex =
        new(@"^\d{2}:\d{2}$", System.Text.RegularExpressions.RegexOptions.Compiled);

    public UpsertOverrideValidator()
    {
        RuleFor(x => x.Date)
            .NotEmpty()
            .Matches(DateRegex)
            .WithMessage("Date must be in yyyy-MM-dd format.");

        RuleFor(x => x.Items)
            .NotNull()
            .Must(items => !HasOverlappingRanges(items))
            .WithMessage("Time ranges must not overlap.");

        RuleForEach(x => x.Items).ChildRules(item =>
        {
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

    private static bool HasOverlappingRanges(List<UpsertOverrideItem> items)
    {
        if (items == null || items.Count < 2) return false;

        var parsed = items
            .Where(i => TimeOnly.TryParse(i.Start, out _) && TimeOnly.TryParse(i.End, out _))
            .Select(i => (Start: TimeOnly.Parse(i.Start), End: TimeOnly.Parse(i.End)))
            .OrderBy(r => r.Start)
            .ToList();

        for (int i = 0; i < parsed.Count - 1; i++)
        {
            if (parsed[i].End > parsed[i + 1].Start)
                return true;
        }

        return false;
    }
}

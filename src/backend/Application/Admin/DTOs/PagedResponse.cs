namespace CalendarBooking.Application.Admin.DTOs;

public record PagedResponse<T>(IReadOnlyList<T> Items, int TotalCount, int Page, int PageSize);

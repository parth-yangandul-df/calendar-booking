namespace CalendarBooking.Application.Auth.DTOs;

public record RegisterRequest(string Email, string Password, string ConfirmPassword);

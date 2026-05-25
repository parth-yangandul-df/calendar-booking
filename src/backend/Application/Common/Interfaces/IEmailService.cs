namespace CalendarBooking.Application.Common.Interfaces;

public interface IEmailService
{
    Task SendAsync(string toAddress, string toName, string subject, string plainTextBody);
}

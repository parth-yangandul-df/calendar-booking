using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using CalendarBooking.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;

namespace CalendarBooking.Infrastructure.Email;

public class EmailService : IEmailService
{
    private readonly string _host;
    private readonly int _port;
    private readonly string _username;
    private readonly string _password;
    private readonly string _fromAddress;
    private readonly string _fromName;

    public EmailService(IConfiguration config)
    {
        _host = config["Email:Host"] ?? string.Empty;
        _port = int.TryParse(config["Email:Port"], out var port) ? port : 587;
        _username = config["Email:Username"] ?? string.Empty;
        _password = config["Email:Password"] ?? string.Empty;
        _fromAddress = config["Email:FromAddress"] ?? string.Empty;
        _fromName = config["Email:FromName"] ?? "Calendar Booking";
    }

    public async Task SendAsync(string toAddress, string toName, string subject, string plainTextBody)
    {
        if (string.IsNullOrEmpty(_host))
            return; // Email not configured — skip silently in dev

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_fromName, _fromAddress));
        message.To.Add(new MailboxAddress(toName, toAddress));
        message.Subject = subject;
        message.Body = new TextPart("plain") { Text = plainTextBody };

        using var client = new SmtpClient();
        var socketOptions = _port == 465 ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.StartTls;
        await client.ConnectAsync(_host, _port, socketOptions);
        await client.AuthenticateAsync(_username, _password);
        await client.SendAsync(message);
        await client.DisconnectAsync(true);
    }
}

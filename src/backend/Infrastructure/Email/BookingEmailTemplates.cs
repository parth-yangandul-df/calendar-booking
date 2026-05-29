namespace CalendarBooking.Infrastructure.Email;

public static class BookingEmailTemplates
{
    public static string BookingCreatedOwnerEmail(string bookerEmail, string date, string startTime, string endTime, string bookingRef)
        => $"You have a new booking request.\n\nBooker: {bookerEmail}\nDate: {date}\nTime: {startTime}–{endTime}\nReference: {bookingRef}\n\nPlease log in to accept or decline.";

    public static string BookingCreatedBookerEmail(string ownerEmail, string date, string startTime, string endTime, string bookingRef)
        => $"Your booking request has been sent.\n\nHost: {ownerEmail}\nDate: {date}\nTime: {startTime}–{endTime}\nReference: {bookingRef}\n\nPlease wait for the host to confirm.";

    public static string BookingConfirmedBookerEmail(string ownerEmail, string date, string startTime, string endTime, string meetUrl, string bookingRef)
        => $"Your booking has been confirmed!\n\nHost: {ownerEmail}\nDate: {date}\nTime: {startTime}–{endTime}\nMeeting: {meetUrl}\nReference: {bookingRef}.";

    public static string BookingConfirmedOwnerEmail(string bookerEmail, string date, string startTime, string endTime, string meetUrl, string bookingRef)
        => $"Booking confirmed.\n\nBooker: {bookerEmail}\nDate: {date}\nTime: {startTime}–{endTime}\nMeeting: {meetUrl}\nReference: {bookingRef}.";

    public static string BookingDeclinedBookerEmail(string ownerEmail, string date, string startTime, string endTime, string bookingRef)
        => $"Your booking request was declined.\n\nHost: {ownerEmail}\nDate: {date}\nTime: {startTime}–{endTime}\nReference: {bookingRef}.";

    public static string BookingDeclinedOwnerEmail(string bookerEmail, string date, string startTime, string endTime, string bookingRef)
        => $"You declined a booking request.\n\nBooker: {bookerEmail}\nDate: {date}\nTime: {startTime}–{endTime}\nReference: {bookingRef}.";

    public static string BookingCancelledOwnerEmail(string bookerEmail, string date, string startTime, string endTime, string bookingRef)
        => $"You cancelled a booking.\n\nBooker: {bookerEmail}\nDate: {date}\nTime: {startTime}–{endTime}\nReference: {bookingRef}.";

    public static string BookingCancelledBookerEmail(string ownerEmail, string date, string startTime, string endTime, string bookingRef)
        => $"Your booking has been cancelled.\n\nHost: {ownerEmail}\nDate: {date}\nTime: {startTime}–{endTime}\nReference: {bookingRef}.";

    public static string SubjectBookingCreated(string date, string startTime) => $"New booking request – {date} {startTime}";
    public static string SubjectBookingConfirmed(string date, string startTime) => $"Booking confirmed – {date} {startTime}";
    public static string SubjectBookingDeclined(string date, string startTime) => $"Booking request declined – {date} {startTime}";
    public static string SubjectBookingCancelled(string date, string startTime) => $"Booking cancelled – {date} {startTime}";
}

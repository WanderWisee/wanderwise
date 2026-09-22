using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace WanderWiseApi.Services;

public class EmailService
{
    private readonly string _senderEmail;
    private readonly string _senderPassword;
    private readonly string _senderName;

    public EmailService()
    {
        _senderEmail = Environment.GetEnvironmentVariable("GMAIL_SENDER_EMAIL")
            ?? throw new InvalidOperationException("GMAIL_SENDER_EMAIL is missing — check backend/.env");
        _senderPassword = Environment.GetEnvironmentVariable("GMAIL_APP_PASSWORD")
            ?? throw new InvalidOperationException("GMAIL_APP_PASSWORD is missing — check backend/.env");
        _senderName = Environment.GetEnvironmentVariable("GMAIL_SENDER_NAME")
            ?? "WanderWise! - MSEUF Capstone Project";
    }

    public async Task SendOtpEmailAsync(string toEmail, string code, string purpose)
    {
        var subject = purpose == "register"
            ? "Verify your WanderWise account"
            : "Reset your WanderWise password";

        var body =
            "Hi there,\n\n" +
            $"Your WanderWise verification code is: {code}\n\n" +
            "This code will expire in 10 minutes. If you didn't request this, you can safely ignore this email.\n\n" +
            "- WanderWise! Team";

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_senderName, _senderEmail));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = subject;
        message.Body = new TextPart("plain") { Text = body };

        using var client = new SmtpClient();
        await client.ConnectAsync("smtp.gmail.com", 587, SecureSocketOptions.StartTls);
        await client.AuthenticateAsync(_senderEmail, _senderPassword);
        await client.SendAsync(message);
        await client.DisconnectAsync(true);
    }
}

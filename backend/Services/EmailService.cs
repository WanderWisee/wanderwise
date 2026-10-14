using System.Net.Http.Headers;
using System.Net.Http.Json;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace WanderWiseApi.Services;

// Sends the OTP emails (sign up, forgot password).
//
// Two ways to send, picked by what is set in backend/.env (or Railway Variables):
//   1. Resend (used online, because Railway blocks Gmail SMTP):
//        RESEND_API_KEY=re_...
//        RESEND_FROM=WanderWise <onboarding@resend.dev>   (or an address on your verified domain)
//   2. Gmail SMTP (used on the laptop when RESEND_API_KEY is not set):
//        GMAIL_SENDER_EMAIL, GMAIL_APP_PASSWORD, GMAIL_SENDER_NAME
public class EmailService
{
    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromSeconds(20) };

    private readonly string? _resendApiKey;
    private readonly string _resendFrom;
    private readonly string? _senderEmail;
    private readonly string? _senderPassword;
    private readonly string _senderName;

    public EmailService()
    {
        _senderName = Environment.GetEnvironmentVariable("GMAIL_SENDER_NAME")
            ?? "WanderWise! - MSEUF Capstone Project";

        _resendApiKey = Environment.GetEnvironmentVariable("RESEND_API_KEY")?.Trim();
        _resendFrom = Environment.GetEnvironmentVariable("RESEND_FROM")?.Trim() is { Length: > 0 } from
            ? from
            : "WanderWise <onboarding@resend.dev>";

        _senderEmail = Environment.GetEnvironmentVariable("GMAIL_SENDER_EMAIL");
        _senderPassword = Environment.GetEnvironmentVariable("GMAIL_APP_PASSWORD");

        if (string.IsNullOrEmpty(_resendApiKey) &&
            (string.IsNullOrEmpty(_senderEmail) || string.IsNullOrEmpty(_senderPassword)))
        {
            throw new InvalidOperationException(
                "No email sender set — add RESEND_API_KEY, or GMAIL_SENDER_EMAIL and GMAIL_APP_PASSWORD, in backend/.env");
        }
    }

    public async Task SendOtpEmailAsync(string toEmail, string code, string purpose)
    {
        var subject = purpose == "register"
            ? "Verify your WanderWise account"
            : "Reset your WanderWise password";

        var heading = purpose == "register"
            ? "Verify your email"
            : "Reset your password";

        var intro = purpose == "register"
            ? "Thanks for signing up! Use the code below to finish creating your account."
            : "We got a request to reset your password. Use the code below to continue.";

        var plainTextBody =
            $"{heading}\n\n{intro}\n\nYour verification code is: {code}\n\n" +
            "This code will expire in 10 minutes. If you didn't request this, you can safely ignore this email.\n\n" +
            "- WanderWise! Team";

        var htmlBody = BuildOtpHtml(heading, intro, code);

        if (!string.IsNullOrEmpty(_resendApiKey))
        {
            await SendWithResendAsync(toEmail, subject, htmlBody, plainTextBody);
            return;
        }

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_senderName, _senderEmail));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = subject;

        var bodyBuilder = new BodyBuilder
        {
            TextBody = plainTextBody,
            HtmlBody = htmlBody,
        };
        message.Body = bodyBuilder.ToMessageBody();

        using var client = new SmtpClient();
        await client.ConnectAsync("smtp.gmail.com", 587, SecureSocketOptions.StartTls);
        await client.AuthenticateAsync(_senderEmail, _senderPassword);
        await client.SendAsync(message);
        await client.DisconnectAsync(true);
    }

    // https://resend.com/docs/api-reference/emails/send-email
    private async Task SendWithResendAsync(string toEmail, string subject, string html, string text)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails")
        {
            Content = JsonContent.Create(new
            {
                from = _resendFrom,
                to = new[] { toEmail },
                subject,
                html,
                text,
            }),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _resendApiKey);

        using var response = await Http.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            Console.WriteLine($"Resend failed ({(int)response.StatusCode}) for {toEmail}: {body}");
            throw new InvalidOperationException($"Resend could not send the email ({(int)response.StatusCode}).");
        }
    }

    private static string BuildOtpHtml(string heading, string intro, string code)
    {
        // Table-based layout with inline styles — the safest approach
        // for consistent rendering across Gmail, Outlook, etc.
        return $@"
<!DOCTYPE html>
<html>
<body style=""margin:0; padding:0; background-color:#f2f6f5; font-family:'Segoe UI', Arial, sans-serif;"">
  <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""background-color:#f2f6f5; padding:32px 0;"">
    <tr>
      <td align=""center"">
        <table role=""presentation"" width=""480"" cellpadding=""0"" cellspacing=""0"" style=""background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.06);"">
          <tr>
            <td style=""background:linear-gradient(135deg,#0f8b8d,#0c6e70); padding:28px 32px;"">
              <span style=""color:#ffffff; font-size:20px; font-weight:700; letter-spacing:0.3px;"">
                WanderWise!
              </span>
              <div style=""color:#d5efee; font-size:12px; margin-top:2px;"">
                MSEUF Capstone Project
              </div>
            </td>
          </tr>
          <tr>
            <td style=""padding:36px 32px 24px;"">
              <h1 style=""margin:0 0 12px; font-size:20px; color:#1a1a1a;"">{heading}</h1>
              <p style=""margin:0 0 24px; font-size:14px; line-height:1.6; color:#4a4a4a;"">
                {intro}
              </p>
              <div style=""background-color:#f2f6f5; border:1px solid #dbeceb; border-radius:10px; padding:20px; text-align:center; margin-bottom:24px;"">
                <span style=""font-size:32px; font-weight:700; letter-spacing:8px; color:#0c6e70;"">
                  {code}
                </span>
              </div>
              <p style=""margin:0 0 8px; font-size:13px; color:#7a7a7a;"">
                This code expires in <strong>10 minutes</strong>.
              </p>
              <p style=""margin:0; font-size:13px; color:#7a7a7a;"">
                If you didn't request this, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style=""padding:20px 32px; background-color:#fafafa; border-top:1px solid #eeeeee;"">
              <p style=""margin:0; font-size:12px; color:#a0a0a0;"">
                &copy; {DateTime.UtcNow.Year} WanderWise! — Manuel S. Enverga University Foundation
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>";
    }
}
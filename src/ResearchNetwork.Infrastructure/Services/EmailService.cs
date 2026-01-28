using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using ResearchNetwork.Application.Interfaces;

namespace ResearchNetwork.Infrastructure.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;

    public EmailService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public async Task SendVerificationEmailAsync(string toEmail, string code)
    {
        var subject = "Research Network - Email Doğrulama Kodu";
        var body = $@"
            <html>
            <body style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;'>
                    <h1 style='color: white; margin: 0;'>Research Network</h1>
                </div>
                <div style='padding: 30px; background: #f9f9f9;'>
                    <h2 style='color: #333;'>Email Doğrulama</h2>
                    <p style='color: #666; font-size: 16px;'>
                        Akademik hesabınızı doğrulamak için aşağıdaki kodu kullanın:
                    </p>
                    <div style='background: #fff; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0;'>
                        <span style='font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #667eea;'>{code}</span>
                    </div>
                    <p style='color: #999; font-size: 14px;'>
                        Bu kod 15 dakika içinde geçerliliğini yitirecektir.
                    </p>
                    <p style='color: #999; font-size: 14px;'>
                        Bu emaili siz talep etmediyseniz, lütfen dikkate almayın.
                    </p>
                </div>
                <div style='padding: 20px; text-align: center; color: #999; font-size: 12px;'>
                    © 2026 Research Network. Tüm hakları saklıdır.
                </div>
            </body>
            </html>";

        await SendEmailAsync(toEmail, subject, body);
    }

    public async Task SendPasswordResetEmailAsync(string toEmail, string code)
    {
        var subject = "Research Network - Şifre Sıfırlama Kodu";
        var body = $@"
            <html>
            <body style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;'>
                    <h1 style='color: white; margin: 0;'>Research Network</h1>
                </div>
                <div style='padding: 30px; background: #f9f9f9;'>
                    <h2 style='color: #333;'>Şifre Sıfırlama</h2>
                    <p style='color: #666; font-size: 16px;'>
                        Şifrenizi sıfırlamak için aşağıdaki kodu kullanın:
                    </p>
                    <div style='background: #fff; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0;'>
                        <span style='font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #667eea;'>{code}</span>
                    </div>
                    <p style='color: #999; font-size: 14px;'>
                        Bu kod 15 dakika içinde geçerliliğini yitirecektir.
                    </p>
                    <p style='color: #999; font-size: 14px;'>
                        Bu emaili siz talep etmediyseniz, lütfen dikkate almayın.
                    </p>
                </div>
                <div style='padding: 20px; text-align: center; color: #999; font-size: 12px;'>
                    © 2026 Research Network. Tüm hakları saklıdır.
                </div>
            </body>
            </html>";

        await SendEmailAsync(toEmail, subject, body);
    }

    private async Task SendEmailAsync(string toEmail, string subject, string body)
    {
        var smtpHost = _configuration["Email:SmtpHost"] ?? "smtp.gmail.com";
        var smtpPort = int.Parse(_configuration["Email:SmtpPort"] ?? "587");
        var smtpUser = _configuration["Email:SmtpUser"] ?? "";
        var smtpPass = _configuration["Email:SmtpPass"] ?? "";
        var fromEmail = _configuration["Email:FromEmail"] ?? smtpUser;
        var fromName = _configuration["Email:FromName"] ?? "Research Network";

        using var client = new SmtpClient(smtpHost, smtpPort)
        {
            EnableSsl = true,
            Credentials = new NetworkCredential(smtpUser, smtpPass)
        };

        var mailMessage = new MailMessage
        {
            From = new MailAddress(fromEmail, fromName),
            Subject = subject,
            Body = body,
            IsBodyHtml = true
        };
        mailMessage.To.Add(toEmail);

        await client.SendMailAsync(mailMessage);
    }
}

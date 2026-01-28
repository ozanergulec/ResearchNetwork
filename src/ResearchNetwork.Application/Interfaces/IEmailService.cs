using System.Threading.Tasks;

namespace ResearchNetwork.Application.Interfaces;

public interface IEmailService
{
    Task SendVerificationEmailAsync(string toEmail, string code);
    Task SendPasswordResetEmailAsync(string toEmail, string code);
}

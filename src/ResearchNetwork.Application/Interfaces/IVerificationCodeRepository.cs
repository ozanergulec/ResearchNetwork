using ResearchNetwork.Domain.Entities;
using ResearchNetwork.Domain.Enums;

namespace ResearchNetwork.Application.Interfaces;

public interface IVerificationCodeRepository
{
    Task<VerificationCode?> GetByCodeAsync(string code);
    Task<VerificationCode?> GetLatestByUserIdAndTypeAsync(Guid userId, VerificationType type);
    Task<VerificationCode> CreateAsync(VerificationCode verificationCode);
    Task UpdateAsync(VerificationCode verificationCode);
    Task DeleteExpiredCodesAsync();
}

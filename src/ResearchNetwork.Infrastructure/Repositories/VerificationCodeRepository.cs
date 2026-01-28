using Microsoft.EntityFrameworkCore;
using ResearchNetwork.Application.Interfaces;
using ResearchNetwork.Domain.Entities;
using ResearchNetwork.Domain.Enums;
using ResearchNetwork.Infrastructure.Data;

namespace ResearchNetwork.Infrastructure.Repositories;

public class VerificationCodeRepository : IVerificationCodeRepository
{
    private readonly AppDbContext _context;

    public VerificationCodeRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<VerificationCode?> GetByCodeAsync(string code)
    {
        return await _context.VerificationCodes
            .Include(v => v.User)
            .FirstOrDefaultAsync(v => v.Code == code && !v.IsUsed && v.ExpiresAt > DateTime.UtcNow);
    }

    public async Task<VerificationCode?> GetLatestByUserIdAndTypeAsync(Guid userId, VerificationType type)
    {
        return await _context.VerificationCodes
            .Where(v => v.UserId == userId && v.Type == type && !v.IsUsed && v.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(v => v.CreatedAt)
            .FirstOrDefaultAsync();
    }

    public async Task<VerificationCode> CreateAsync(VerificationCode verificationCode)
    {
        _context.VerificationCodes.Add(verificationCode);
        await _context.SaveChangesAsync();
        return verificationCode;
    }

    public async Task UpdateAsync(VerificationCode verificationCode)
    {
        _context.VerificationCodes.Update(verificationCode);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteExpiredCodesAsync()
    {
        var expiredCodes = await _context.VerificationCodes
            .Where(v => v.ExpiresAt < DateTime.UtcNow || v.IsUsed)
            .ToListAsync();

        _context.VerificationCodes.RemoveRange(expiredCodes);
        await _context.SaveChangesAsync();
    }
}

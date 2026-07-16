using GlicoCare.Application.Interfaces.Repositories;
using GlicoCare.Domain.Entities;
using GlicoCare.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GlicoCare.Infrastructure.Repositories;

public class RefreshTokenRepository : GenericRepository<RefreshToken>, IRefreshTokenRepository
{
    public RefreshTokenRepository(GlicoCareDbContext context) : base(context) { }

    public async Task<RefreshToken?> GetByTokenAsync(string token, CancellationToken cancellationToken = default)
        => await DbSet.FirstOrDefaultAsync(rt => rt.Token == token, cancellationToken);
}

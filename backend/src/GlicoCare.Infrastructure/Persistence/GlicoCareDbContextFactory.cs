using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace GlicoCare.Infrastructure.Persistence;

/// <summary>
/// Enables `dotnet ef migrations add` to instantiate the DbContext at design time without
/// needing the API host or a real database connection. The connection string here is a
/// dummy value used only to build the model/migration SQL.
/// </summary>
public class GlicoCareDbContextFactory : IDesignTimeDbContextFactory<GlicoCareDbContext>
{
    public GlicoCareDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<GlicoCareDbContext>();
        optionsBuilder.UseSqlServer(
            "Server=(localdb)\\mssqllocaldb;Database=GlicoCareDb;Trusted_Connection=True;TrustServerCertificate=True;");

        return new GlicoCareDbContext(optionsBuilder.Options);
    }
}

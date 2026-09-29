using Microsoft.EntityFrameworkCore;
using WanderWiseApi.Models;

namespace WanderWiseApi.Data;



public class WanderWiseDbContext : DbContext
{
    public WanderWiseDbContext(DbContextOptions<WanderWiseDbContext> options) : base(options) { }
    public DbSet<TripView> TripViews { get; set; }
    public DbSet<TripBooking> TripBookings { get; set; }
    public DbSet<UserSettings> UserSettings { get; set; }
    public DbSet<User> Users => Set<User>();
    public DbSet<Trip> Trips => Set<Trip>();
    public DbSet<TripSection> TripSections => Set<TripSection>();
    public DbSet<TripPlace> TripPlaces => Set<TripPlace>();
    public DbSet<TripMember> TripMembers => Set<TripMember>();
    public DbSet<Expense> Expenses => Set<Expense>();
    public DbSet<Destination> Destinations => Set<Destination>();
    public DbSet<TravelGuide> TravelGuides => Set<TravelGuide>();
    public DbSet<GuideHotelOption> GuideHotelOptions => Set<GuideHotelOption>();
    public DbSet<Hotel> Hotels => Set<Hotel>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<JournalEntry> JournalEntries => Set<JournalEntry>();
    public DbSet<JournalEntryPlace> JournalEntryPlaces => Set<JournalEntryPlace>();
    public DbSet<JournalEntryPro> JournalEntryPros => Set<JournalEntryPro>();
    public DbSet<JournalEntryCon> JournalEntryCons => Set<JournalEntryCon>();
    public DbSet<JournalEntryHotel> JournalEntryHotels => Set<JournalEntryHotel>();
    public DbSet<OtpCode> OtpCodes => Set<OtpCode>();
    public DbSet<JournalComment> JournalComments => Set<JournalComment>();
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>().HasIndex(u => u.StudentNumber).IsUnique();
        modelBuilder.Entity<Trip>().HasIndex(t => t.ShareToken).IsUnique();

        modelBuilder.Entity<TripSection>()
            .HasOne(s => s.Trip)
            .WithMany(t => t.Sections)
            .HasForeignKey(s => s.TripId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TripPlace>()
            .HasOne(p => p.Trip)
            .WithMany(t => t.Places)
            .HasForeignKey(p => p.TripId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TripPlace>()
            .HasOne(p => p.Section)
            .WithMany()
            .HasForeignKey(p => p.SectionId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<TripMember>()
            .HasOne(m => m.Trip)
            .WithMany(t => t.Members)
            .HasForeignKey(m => m.TripId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Expense>()
            .HasOne(e => e.Trip)
            .WithMany(t => t.Expenses)
            .HasForeignKey(e => e.TripId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Expense>()
            .HasOne(e => e.Place)
            .WithMany()
            .HasForeignKey(e => e.PlaceId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<TravelGuide>()
            .HasOne(g => g.Destination)
            .WithMany()
            .HasForeignKey(g => g.DestinationId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<GuideHotelOption>()
            .HasOne(o => o.Guide)
            .WithMany(g => g.HotelOptions)
            .HasForeignKey(o => o.GuideId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Hotel>()
            .HasOne(h => h.Destination)
            .WithMany()
            .HasForeignKey(h => h.DestinationId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Notification>()
            .HasOne(n => n.User)
            .WithMany(u => u.Notifications)
            .HasForeignKey(n => n.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<JournalEntry>()
            .HasOne(j => j.User)
            .WithMany(u => u.JournalEntries)
            .HasForeignKey(j => j.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<JournalEntryPlace>()
            .HasOne(p => p.JournalEntry)
            .WithMany(j => j.Places)
            .HasForeignKey(p => p.JournalEntryId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<JournalEntryPro>()
            .HasOne(p => p.Place)
            .WithMany(pl => pl.Pros)
            .HasForeignKey(p => p.PlaceId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<JournalEntryCon>()
            .HasOne(c => c.Place)
            .WithMany(pl => pl.Cons)
            .HasForeignKey(c => c.PlaceId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<JournalEntryHotel>()
            .HasOne(h => h.Place)
            .WithMany(pl => pl.Hotels)
            .HasForeignKey(h => h.PlaceId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

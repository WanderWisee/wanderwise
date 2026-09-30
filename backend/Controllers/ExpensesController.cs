using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WanderWiseApi.Data;
using WanderWiseApi.DTOs;
using WanderWiseApi.Models;

namespace WanderWiseApi.Controllers;

[ApiController]
[Route("api/trips/{tripId:int}/expenses")]
[Authorize]
public class ExpensesController : ControllerBase
{
    private readonly WanderWiseDbContext _db;

    public ExpensesController(WanderWiseDbContext db)
    {
        _db = db;
    }

    private int CurrentUserId => int.Parse(User.FindFirstValue(JwtRegisteredClaimNames.Sub)!);

    // Same access rule as TripsController.GetAccessibleTripAsync: the owner
    // AND anyone who joined the trip as crew can see and manage its
    // expenses. Before this, only the owner passed the check, so crew
    // members got a 404 here even though they could open the trip itself.
    private async Task<bool> CanAccessTripAsync(int tripId)
    {
        var isOwner = await _db.Trips.AnyAsync(t => t.Id == tripId && t.UserId == CurrentUserId);
        if (isOwner) return true;

        return await _db.TripMembers.AnyAsync(m => m.TripId == tripId && m.UserId == CurrentUserId);
    }

    [HttpGet]
    public async Task<IActionResult> GetExpenses(int tripId)
    {
        if (!await CanAccessTripAsync(tripId)) return NotFound();

        var expenses = await _db.Expenses.Where(e => e.TripId == tripId).ToListAsync();
        return Ok(expenses);
    }

    [HttpPost]
    public async Task<IActionResult> AddExpense(int tripId, [FromBody] CreateExpenseRequest request)
    {
        if (!await CanAccessTripAsync(tripId)) return NotFound();

        var expense = new Expense
        {
            TripId = tripId,
            PlaceId = request.PlaceId,
            Category = request.Category,
            Amount = request.Amount,
            Description = request.Description,
            ExpenseDate = request.ExpenseDate,
            CreatedAt = DateTime.UtcNow,
        };

        _db.Expenses.Add(expense);
        await _db.SaveChangesAsync();

        // Trip updates: tell the rest of the crew, then check the budget.
        var trip = await _db.Trips.FirstOrDefaultAsync(t => t.Id == tripId);
        if (trip != null)
        {
            var actor = await _db.Users.FindAsync(CurrentUserId);
            var actorName = NotificationHelper.FullName(actor);
            var tripName = trip.Destination ?? trip.Title ?? "";
            var amountText = Convert.ToDecimal(expense.Amount).ToString("N0");
            await NotificationHelper.NotifyTripCrewAsync(
                _db, trip, CurrentUserId, NotificationHelper.ExpenseAdded,
                $"{actorName} added an expense to {tripName}: {expense.Category} ₱{amountText}.",
                new { actorName, tripDestination = tripName, category = expense.Category, amount = amountText });

            await NotificationHelper.CheckBudgetAsync(_db, trip);
        }

        return Ok(expense);
    }

    [HttpDelete("{expenseId:int}")]
    public async Task<IActionResult> DeleteExpense(int tripId, int expenseId)
    {
        if (!await CanAccessTripAsync(tripId)) return NotFound();

        var expense = await _db.Expenses
            .FirstOrDefaultAsync(e => e.Id == expenseId && e.TripId == tripId);
        if (expense is null) return NotFound();

        _db.Expenses.Remove(expense);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
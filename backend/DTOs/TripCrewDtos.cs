namespace WanderWiseApi.DTOs;

// Body for POST /api/trips/{id}/crew — adding an existing student account
// (found via the same /api/users/search used on Profile) directly as crew.
public class AddCrewMemberRequest
{
    public int UserId { get; set; }
}
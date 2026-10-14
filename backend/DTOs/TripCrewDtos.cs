namespace WanderWiseApi.DTOs;

// Body for POST /api/trips/{id}/crew — adding an existing student account
// (found via the same /api/users/search used on Profile) directly as crew.
public class AddCrewMemberRequest
{
    public int UserId { get; set; }
}

// Body for PUT /api/trips/{id}/crew/{memberId}/permission — the owner
// turning a crew member's edit access on or off.
public class SetCrewPermissionRequest
{
    public bool CanEdit { get; set; }
}
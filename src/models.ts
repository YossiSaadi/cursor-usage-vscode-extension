/**
 * Represents the response from the /api/dashboard/teams endpoint.
 */
export interface TeamsResponse {
  teams: Team[];
}

/**
 * Represents a team as returned by the /api/dashboard/teams endpoint.
 */
export interface Team {
  id: number;
  name: string;
}

/**
 * Represents the details of a team, including the current user's ID.
 * Returned by the /api/dashboard/team endpoint.
 */
export interface TeamDetails {
  userId: number;
}

/**
 * Represents the usage data for a single team member.
 */
export interface TeamMemberSpend {
  email: string;
  fastPremiumRequests?: number;
  userId?: number;
  spendCents?: number;
  hardLimitOverrideDollars?: number;
  name?: string;
  role?: string;
}

/**
 * Represents the overall spend data for a team.
 * Returned by the /api/dashboard/get-team-spend endpoint.
 */
export interface SpendData {
  teamMemberSpend: TeamMemberSpend[];
}

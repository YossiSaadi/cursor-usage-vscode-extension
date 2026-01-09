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

/**
 * Represents the response from /api/auth/me endpoint for individual user authentication.
 */
export interface UserMeResponse {
  email: string;
  email_verified: boolean;
  name: string;
  sub: string; // user ID like "user_SOMEUSERID"
  updated_at: string;
  picture: string | null;
}

/**
 * Represents the usage data for a specific model.
 */
export interface ModelUsage {
  numRequests: number;
  numRequestsTotal: number;
  numTokens: number;
  maxRequestUsage: number | null;
  maxTokenUsage: number | null;
}

/**
 * Represents the response from /api/usage?user=USER_ID endpoint for individual user usage.
 */
export interface UserUsageResponse {
  "gpt-4": ModelUsage;
  "gpt-3.5-turbo": ModelUsage;
  "gpt-4-32k": ModelUsage;
  startOfMonth: string; // ISO date string
}

/**
 * Represents the plan usage information from the usage-summary endpoint.
 */
export interface PlanUsage {
  used: number;      // Amount used in cents
  limit: number;     // Limit in cents
  remaining: number; // Remaining in cents
}

/**
 * Represents the individual usage information from the usage-summary endpoint.
 */
export interface IndividualUsage {
  plan: PlanUsage;
}

/**
 * Represents the response from /api/usage-summary endpoint.
 */
export interface UsageSummaryResponse {
  individualUsage: IndividualUsage;
  billingCycleEnd: string; // ISO date string
}

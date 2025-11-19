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
  hardLimitDollars?: number;
  name?: string;
  role?: string;
}

/**
 * Represents the overall spend data for a team.
 * Returned by the /api/dashboard/get-team-spend endpoint.
 */
export interface SpendData {
  teamMemberSpend: TeamMemberSpend[];
  hardLimitDollars?: number;
  hardLimitCents?: number;
  defaultHardLimitDollars?: number;
  defaultHardLimitCents?: number;
  teamHardLimitDollars?: number;
  teamHardLimitCents?: number;
}

interface UsageSummaryBreakdown {
  included?: number;
  bonus?: number;
  total?: number;
}

export interface UsageSummaryMetric {
  enabled: boolean;
  used: number;
  limit: number;
  remaining: number;
  breakdown?: UsageSummaryBreakdown;
}

export interface UsageSummaryResponse {
  billingCycleStart: string;
  billingCycleEnd: string;
  membershipType?: string;
  limitType?: string;
  isUnlimited?: boolean;
  individualUsage?: {
    plan?: UsageSummaryMetric;
    onDemand?: UsageSummaryMetric;
  };
  teamUsage?: Record<string, unknown>;
}

export interface HardLimitResponse {
  hardLimit: number;
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

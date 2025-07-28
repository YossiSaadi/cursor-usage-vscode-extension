import { exec } from "child_process";
import { promisify } from "util";
import { TeamsResponse, TeamDetails, SpendData, UserMeResponse, UserUsageResponse } from "./models";

const execAsync = promisify(exec);
const BASE_URL = "https://cursor.com/api";

/**
 * A generic and secure wrapper for making requests to the Cursor API using curl.
 * @param method The HTTP method (GET or POST).
 * @param endpoint The API endpoint (relative to BASE_URL).
 * @param userCookie The user's authentication cookie.
 * @param body The request body (for POST requests).
 * @returns A promise that resolves to the JSON response.
 */
async function makeRequest<T>(
  method: "GET" | "POST",
  endpoint: string,
  userCookie: string,
  body?: object
): Promise<T> {
  const url = `${BASE_URL}/${endpoint}`;
  console.log(`[Cursor Usage] Making ${method} request to ${endpoint} using curl`);

  const escapedCookie = userCookie.replace(/'/g, "'\\''");
  
  let command = `curl -s -L '${url}' \
      -H 'Content-Type: application/json' \
      -b 'WorkosCursorSessionToken=${escapedCookie}'`;

  if (method === "POST" && body) {
    const escapedBody = JSON.stringify(body).replace(/'/g, "'\\''");
    command += ` --data-raw '${escapedBody}'`;
  }

  try {
    const { stdout } = await execAsync(command);
    if (!stdout) {
      throw new Error(`${method} request returned empty stdout`);
    }
    return JSON.parse(stdout) as T;
  } catch (error: any) {
    console.error(
      `[Cursor Usage] ${method} request failed for ${endpoint}: ${error.message}`
    );
    // Re-throw the error to be handled by the calling function
    throw error;
  }
}

/**
 * Makes a POST request to the Cursor API.
 */
async function post<T>(
  endpoint: string,
  userCookie: string,
  body: object
): Promise<T> {
  return makeRequest<T>("POST", endpoint, userCookie, body);
}

/**
 * Makes a GET request to the Cursor API.
 */
async function get<T>(
  endpoint: string,
  userCookie: string
): Promise<T> {
  return makeRequest<T>("GET", endpoint, userCookie);
}

/** Fetches all teams the user belongs to. */
export async function fetchTeams(cookie: string): Promise<TeamsResponse> {
  return post<TeamsResponse>("dashboard/teams", cookie, {});
}

/** Fetches details for a specific team, including the user's ID within that team. */
export async function fetchTeamDetails(
  teamId: number,
  cookie: string
): Promise<TeamDetails> {
  return post<TeamDetails>("dashboard/team", cookie, { teamId });
}

/** Fetches the spend data for all members of a specific team. */
export async function fetchTeamSpend(
  teamId: number,
  cookie: string
): Promise<SpendData> {
  return post<SpendData>("dashboard/get-team-spend", cookie, { teamId });
}

/** Fetches the current user's information from /api/auth/me. */
export async function fetchUserMe(cookie: string): Promise<UserMeResponse> {
  return get<UserMeResponse>("auth/me", cookie);
}

/** Fetches the current user's usage data from /api/usage?user=USER_ID. */
export async function fetchUserUsage(userId: string, cookie: string): Promise<UserUsageResponse> {
  return get<UserUsageResponse>(`usage?user=${userId}`, cookie);
}

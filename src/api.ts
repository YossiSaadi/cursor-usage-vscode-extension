import { exec } from "child_process";
import { promisify } from "util";
import { TeamsResponse, TeamDetails, SpendData } from "./models";

const execAsync = promisify(exec);
const BASE_URL = "https://www.cursor.com/api/dashboard";

/**
 * A generic and secure wrapper for making POST requests to the Cursor API using curl.
 * It ensures the cookie is only used here and not logged.
 * @param endpoint The API endpoint to hit.
 * @param userCookie The user's authentication cookie.
 * @param body The request body.
 * @returns A promise that resolves to the JSON response.
 */
async function post<T>(
  endpoint: string,
  userCookie: string,
  body: object
): Promise<T> {
  const url = `${BASE_URL}/${endpoint}`;
  console.log(`[Cursor Usage] Fetching data from ${endpoint} using curl`);

  const escapedBody = JSON.stringify(body).replace(/'/g, "'\\''");
  const escapedCookie = userCookie.replace(/'/g, "'\\''");

  const command = `curl -s -L '${url}' \
      -H 'Content-Type: application/json' \
      -b 'WorkosCursorSessionToken=${escapedCookie}' \
      --data-raw '${escapedBody}'`;

  try {
    const { stdout } = await execAsync(command);
    if (!stdout) {
      throw new Error("curl command returned empty stdout");
    }
    return JSON.parse(stdout) as T;
  } catch (error: any) {
    console.error(
      `[Cursor Usage] curl command failed for ${endpoint}: ${error.message}`
    );
    // Re-throw the error to be handled by the calling function
    throw error;
  }
}

/** Fetches all teams the user belongs to. */
export async function fetchTeams(cookie: string): Promise<TeamsResponse> {
  return post<TeamsResponse>("teams", cookie, {});
}

/** Fetches details for a specific team, including the user's ID within that team. */
export async function fetchTeamDetails(
  teamId: number,
  cookie: string
): Promise<TeamDetails> {
  return post<TeamDetails>("team", cookie, { teamId });
}

/** Fetches the spend data for all members of a specific team. */
export async function fetchTeamSpend(
  teamId: number,
  cookie: string
): Promise<SpendData> {
  return post<SpendData>("get-team-spend", cookie, { teamId });
}

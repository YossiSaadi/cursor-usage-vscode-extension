import * as https from "https";
import { TeamsResponse, TeamDetails, SpendData, UserMeResponse, UserUsageResponse } from "./models";

const BASE_URL = "https://cursor.com/api";

/**
 * A generic and secure wrapper for making requests to the Cursor API using Node.js https module.
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
  console.log(`[Cursor Usage] Making ${method} request to ${endpoint}`);

  const options: https.RequestOptions = {
    method,
    headers: {
      "Content-Type": "application/json",
      "Cookie": `WorkosCursorSessionToken=${userCookie}`,
      "Origin": "https://cursor.com"
    }
  };

  return new Promise<T>((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            const parsedData = JSON.parse(data);
            resolve(parsedData as T);
          } else {
            console.error(`[Cursor Usage] HTTP error ${res.statusCode} for ${url}: ${data}`);
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        } catch (error) {
          console.error(`[Cursor Usage] Failed to parse response for ${url}: ${error}`);
          reject(new Error(`Failed to parse response: ${error}`));
        }
      });
    });

    req.on("error", (error) => {
      console.error(
        `[Cursor Usage] ${method} request failed for ${url}: ${error.message}`
      );
      reject(error);
    });

    if (method === "POST" && body) {
      const requestBody = JSON.stringify(body);
      req.write(requestBody);
    }

    req.end();
  });
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

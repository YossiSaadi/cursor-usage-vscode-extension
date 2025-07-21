import * as vscode from "vscode";
import * as api from "./api";
import * as statusBar from "./statusBar";
import * as config from "./configuration";

let refreshTimer: NodeJS.Timeout | undefined;

/**
 * This is the main activation function for the extension.
 * It's called by VS Code when the extension is activated.
 */
export function activate(context: vscode.ExtensionContext) {
  console.log("[Cursor Usage] Extension is now active.");

  statusBar.createStatusBarItem();

  // Register all commands and add them to subscriptions
  const insertCookieCommand = vscode.commands.registerCommand(
    "cursorUsage.insertCookie",
    () => insertCookie(context)
  );
  const refreshCommand = vscode.commands.registerCommand(
    "cursorUsage.refresh",
    () => refreshUsage(context)
  );
  const openSettingsCommand = vscode.commands.registerCommand(
    "cursorUsage.openSettings",
    openSettings
  );
  const forceRefreshCommand = vscode.commands.registerCommand(
    "cursorUsage.forceRefresh",
    () => forceRefresh(context)
  );
  const setTeamIdCommand = vscode.commands.registerCommand(
    "cursorUsage.setTeamId",
    setTeamId
  );
  const setPollMinutesCommand = vscode.commands.registerCommand(
    "cursorUsage.setPollMinutes",
    setPollMinutes
  );
  context.subscriptions.push(
    statusBar.getStatusBarItem(),
    insertCookieCommand,
    refreshCommand,
    openSettingsCommand,
    forceRefreshCommand,
    setTeamIdCommand,
    setPollMinutesCommand
  );

  // Initial refresh and setup the timer for periodic refreshes.
  refreshUsage(context);
  setupRefreshTimer(context);

  // Listen for configuration changes to update the refresh timer interval.
  const configChangeListener = vscode.workspace.onDidChangeConfiguration(
    (event) => {
      let shouldRefresh = false;

      if (event.affectsConfiguration("cursorUsage.pollMinutes")) {
        setupRefreshTimer(context);
      }

      if (event.affectsConfiguration("cursorUsage.teamId")) {
        // Team ID changed, clear the cached one if it exists
        const teamId = config.getTeamIdFromSettings();
        if (teamId) {
          context.workspaceState.update("cursor.teamId", undefined);
        }
        shouldRefresh = true;
      }

      if (shouldRefresh) {
        refreshUsage(context);
      }
    }
  );
  context.subscriptions.push(configChangeListener);
}

/**
 * This function is called when the extension is deactivated.
 * It cleans up resources, like clearing the refresh timer.
 */
export function deactivate() {
  console.log("[Cursor Usage] Extension is now deactivated.");
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
}

/**
 * Prompts the user to enter their cookie and stores it securely.
 * We use VS Code's SecretStorage, which is the most secure way to store
 * sensitive information like tokens or cookies in an extension.
 * The stored secret is local to the user's machine and not accessible
 * by other extensions unless they know the specific key.
 */
async function insertCookie(context: vscode.ExtensionContext): Promise<void> {
  try {
    const cookieValue = await vscode.window.showInputBox({
      prompt: "Enter your WorkosCursorSessionToken cookie value",
      placeHolder: "Paste cookie value here...",
      password: true,
      ignoreFocusOut: true,
    });

    if (cookieValue && cookieValue.trim()) {
      // Securely store the cookie.
      await context.secrets.store("cursor.cookie", cookieValue.trim());
      vscode.window.showInformationMessage("Cookie saved successfully!");
      await refreshUsage(context);
    } else {
      vscode.window.showWarningMessage("No cookie value provided.");
    }
  } catch (error: any) {
    console.error(`[Cursor Usage] Failed to save cookie: ${error.message}`);
    vscode.window.showErrorMessage(`Failed to save cookie: ${error.message}`);
  }
}

/**
 * Opens the VS Code settings UI focused on this extension's settings.
 */
function openSettings(): void {
  vscode.commands.executeCommand(
    "workbench.action.openSettings",
    "@ext:cursor-usage.cursor-usage"
  );
}

/**
 * The core logic for fetching usage data and updating the UI.
 */
async function refreshUsage(context: vscode.ExtensionContext): Promise<void> {
  console.log("[Cursor Usage] Attempting to refresh usage...");
  try {
    // The cookie is retrieved from secure storage right before it's used
    // and is never stored in a variable accessible outside this scope.
    const cookie = await context.secrets.get("cursor.cookie");
    if (!cookie) {
      statusBar.setStatusBarWarning("Set Cookie");
      vscode.window.showWarningMessage(
        'Cursor cookie not found. Use "Cursor Usage Extension: Insert cookie value" command to set it.'
      );
      return;
    }

    const teamId = await getTeamId(context, cookie);
    if (!teamId) {
      statusBar.setStatusBarError("Team ID?");
      vscode.window.showErrorMessage(
        "Could not determine your Cursor Team ID. Please set it in the extension settings."
      );
      return;
    }

    const userDetails = await api.fetchTeamDetails(teamId, cookie);
    const spendData = await api.fetchTeamSpend(teamId, cookie);

    const mySpend = spendData.teamMemberSpend.find(
      (member) => member.userId === userDetails.userId
    );

    if (!mySpend || typeof mySpend.fastPremiumRequests !== "number") {
      statusBar.setStatusBarWarning("No Data");
      console.warn(
        `[Cursor Usage] Could not find spend data for User ID: ${userDetails.userId}`
      );
      return;
    }

    const totalRequests = 500;
    const usedRequests = mySpend.fastPremiumRequests;
    const remainingRequests = totalRequests - usedRequests;

    // Extract spending information if available
    const spendCents = mySpend.spendCents;
    const hardLimitDollars = mySpend.hardLimitOverrideDollars;

    statusBar.updateStatusBar(remainingRequests, spendCents, hardLimitDollars);

    let logMessage = `[Cursor Usage] Successfully updated status bar. Remaining requests: ${remainingRequests}`;
    if (spendCents !== undefined && hardLimitDollars !== undefined) {
      const spendDollars = (spendCents / 100).toFixed(2);
      logMessage += `, Current spend: $${spendDollars}/$${hardLimitDollars.toFixed(2)}`;
    }
    console.log(logMessage);
  } catch (error: any) {
    statusBar.setStatusBarError("Refresh Failed");
    console.error(
      `[Cursor Usage] Failed to refresh Cursor usage: ${error.message}`
    );
  }
}

/**
 * Determines the team ID to use, prioritizing user settings over auto-detection.
 * @param cookie The user's authentication cookie.
 * @returns The team ID number or undefined if not found.
 */
async function getTeamId(
  context: vscode.ExtensionContext,
  cookie: string
): Promise<number | undefined> {
  const teamIdFromSettings = config.getTeamIdFromSettings();
  if (teamIdFromSettings && teamIdFromSettings.toLowerCase() === "auto") {
    // If set to "auto", clear settings and proceed to auto-detect
    await vscode.workspace
      .getConfiguration("cursorUsage")
      .update("teamId", "", vscode.ConfigurationTarget.Global);
  } else if (teamIdFromSettings && !isNaN(parseInt(teamIdFromSettings, 10))) {
    const teamId = parseInt(teamIdFromSettings, 10);
    console.log(`[Cursor Usage] Using Team ID from settings: ${teamId}`);
    return teamId;
  }

  // Try to get from cache first
  const cachedTeamId = context.workspaceState.get<number>("cursor.teamId");
  if (cachedTeamId) {
    console.log(`[Cursor Usage] Using cached Team ID: ${cachedTeamId}`);
    return cachedTeamId;
  }

  console.log(
    "[Cursor Usage] Team ID not in settings or cache, attempting to fetch automatically."
  );
  try {
    const response = await api.fetchTeams(cookie);
    if (response && response.teams && response.teams.length > 0) {
      const teamId = response.teams[0].id;
      console.log(
        `[Cursor Usage] Automatically detected and cached Team ID: ${teamId}`
      );
      // Cache the detected team ID
      await context.workspaceState.update("cursor.teamId", teamId);
      return teamId;
    }
    console.warn("[Cursor Usage] No teams found for this user.");
    return undefined;
  } catch (error: any) {
    console.error(
      `[Cursor Usage] Failed to auto-detect Team ID: ${error.message}`
    );
    // Re-throwing the error to be caught by refreshUsage
    throw error;
  }
}

/**
 * Sets up the automatic refresh timer based on the user's configuration.
 */
function setupRefreshTimer(context: vscode.ExtensionContext): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }

  const pollMinutes = config.getPollMinutes();
  const pollIntervalMs = pollMinutes * 60 * 1000;

  refreshTimer = setInterval(() => {
    refreshUsage(context);
  }, pollIntervalMs);

  console.log(`[Cursor Usage] Refresh timer set to ${pollMinutes} minutes.`);
}

/**
 * Resets the extension by clearing the cache, re-initializing the timer, and forcing a refresh.
 * @param context The extension context.
 */
async function forceRefresh(context: vscode.ExtensionContext) {
  console.log("[Cursor Usage] Forcing a full refresh...");
  // Clear cached data
  await context.workspaceState.update("cursor.teamId", undefined);
  console.log("[Cursor Usage] Cleared cached Team ID.");

  // Reset and setup timer
  setupRefreshTimer(context);

  // Refresh usage data
  await refreshUsage(context);
  vscode.window.showInformationMessage(
    "Cursor Usage extension has been re-initialized."
  );
}

/**
 * Shows an input box to let the user set their Team ID.
 */
async function setTeamId() {
  const teamId = await vscode.window.showInputBox({
    prompt:
      "(Optional) Your Cursor Team ID. Leave empty or set to 'auto' to auto-detect.",
    placeHolder: "Enter your Team ID or 'auto'",
    value: config.getTeamIdFromSettings() || "",
  });

  // Undefined means the user cancelled the input box
  if (teamId !== undefined) {
    await vscode.workspace
      .getConfiguration("cursorUsage")
      .update("teamId", teamId, vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage(
      `Cursor Team ID set to: ${teamId || "auto"}`
    );
  }
}

/**
 * Shows an input box to let the user set the poll interval.
 */
async function setPollMinutes() {
  const pollMinutes = await vscode.window.showInputBox({
    prompt: "How often to refresh the remaining requests count (in minutes)",
    placeHolder: "Enter a number in minutes",
    value: String(config.getPollMinutes()),
    validateInput: (text) => {
      const num = parseInt(text, 10);
      return isNaN(num) || num <= 0 ? "Please enter a positive number." : null;
    },
  });

  if (pollMinutes !== undefined) {
    await vscode.workspace
      .getConfiguration("cursorUsage")
      .update(
        "pollMinutes",
        parseInt(pollMinutes, 10),
        vscode.ConfigurationTarget.Global
      );
    vscode.window.showInformationMessage(
      `Cursor poll interval set to: ${pollMinutes} minutes.`
    );
  }
}

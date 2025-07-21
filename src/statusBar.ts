import * as vscode from "vscode";

let statusBarItem: vscode.StatusBarItem;
const TOTAL_REQUESTS = 500;

/**
 * Creates and displays the status bar item.
 */
export function createStatusBarItem() {
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  statusBarItem.command = "cursorUsage.refresh";
  statusBarItem.tooltip = "Remaining Cursor fast-premium requests";
  statusBarItem.text = "$(zap) Loading...";
  statusBarItem.show();
}

/**
 * Updates the status bar with the remaining requests, spending info, and appropriate color/icon.
 * @param remainingRequests The number of requests left.
 * @param spendCents The amount spent in cents (optional).
 * @param hardLimitDollars The hard limit in dollars (optional).
 */
export function updateStatusBar(
  remainingRequests: number,
  spendCents?: number,
  hardLimitDollars?: number
) {
  if (!statusBarItem) {
    return;
  }

  const warningThreshold = TOTAL_REQUESTS * 0.1; // 10%
  let icon = "$(zap)";

  // Reset background color before setting it.
  statusBarItem.backgroundColor = undefined;

  // Calculate spending status if data is available
  let isCloseToSpendLimit = false;
  let isOverSpendLimit = false;
  if (spendCents !== undefined && hardLimitDollars !== undefined) {
    const spendDollars = spendCents / 100;
    const spendPercentage = spendDollars / hardLimitDollars;
    isCloseToSpendLimit = spendPercentage >= 0.8; // 80% of spend limit
    isOverSpendLimit = spendDollars >= hardLimitDollars;
  }

  // Determine warning/error states based on current display mode
  let shouldShowError = false;
  let shouldShowWarning = false;

  if (remainingRequests > 0) {
    // When showing requests: base colors on request status
    const isLowOnRequests = remainingRequests <= warningThreshold;
    shouldShowWarning = isLowOnRequests;
    shouldShowError = false; // Never error state when requests remain
  } else {
    // When showing spending (0 requests): base colors on spending status
    shouldShowError = isOverSpendLimit;
    shouldShowWarning = isCloseToSpendLimit && !isOverSpendLimit;
  }

  // Set icon and background based on determined status
  if (shouldShowError) {
    icon = "$(error)";
    statusBarItem.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.errorBackground"
    );
  } else if (shouldShowWarning) {
    icon = "$(warning)";
    statusBarItem.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.warningBackground"
    );
  }

  // Build status text - primary display is remaining requests
  // Only show spending when there are 0 requests left
  let statusText: string;
  
  if (remainingRequests > 0) {
    // Show remaining requests
    statusText = `${icon} ${remainingRequests}`;
  } else {
    // No requests left - show spending instead (if available)
    if (spendCents !== undefined && hardLimitDollars !== undefined) {
      const spendDollars = (spendCents / 100).toFixed(2);
      const limitDollars = hardLimitDollars.toFixed(2);
      statusText = `${icon} $${spendDollars}/$${limitDollars}`;
    } else {
      // No spending data available, just show 0
      statusText = `${icon} 0`;
    }
  }

  statusBarItem.text = statusText;

  // Update tooltip with detailed information
  updateTooltip(remainingRequests, spendCents, hardLimitDollars);
}

/**
 * Updates the tooltip with comprehensive usage and spending information.
 * @param remainingRequests The number of requests left.
 * @param spendCents The amount spent in cents (optional).
 * @param hardLimitDollars The hard limit in dollars (optional).
 */
function updateTooltip(
  remainingRequests: number,
  spendCents?: number,
  hardLimitDollars?: number
) {
  if (!statusBarItem) {
    return;
  }

  const usedRequests = TOTAL_REQUESTS - remainingRequests;
  const requestPercentage = ((usedRequests / TOTAL_REQUESTS) * 100).toFixed(1);

  let tooltip = `Cursor Usage:\n` +
    `• Fast Premium Requests: ${remainingRequests}/${TOTAL_REQUESTS} remaining (${requestPercentage}% used)\n` +
    `• Click to refresh usage data`;

  if (spendCents !== undefined && hardLimitDollars !== undefined) {
    const spendDollars = spendCents / 100;
    const spendPercentage = ((spendDollars / hardLimitDollars) * 100).toFixed(1);
    const remainingDollars = (hardLimitDollars - spendDollars).toFixed(2);
    
    tooltip += `\n\nUsage-Based Spending:\n` +
      `• Current spend: $${spendDollars.toFixed(2)} of $${hardLimitDollars.toFixed(2)} limit (${spendPercentage}% used)\n` +
      `• Remaining budget: $${remainingDollars}`;

    // Context-aware warnings based on what's being displayed
    if (remainingRequests > 0) {
      // When showing requests, only warn about request status
      if (remainingRequests <= TOTAL_REQUESTS * 0.1) {
        tooltip += `\n• ⚠️ Low on fast premium requests`;
      }
    } else {
      // When showing spending, warn about spending status
      if (spendDollars >= hardLimitDollars) {
        tooltip += `\n• ⚠️ Spend limit reached!`;
      } else if (spendDollars / hardLimitDollars >= 0.8) {
        tooltip += `\n• ⚠️ Approaching spend limit`;
      }
      tooltip += `\n• ⚠️ No fast premium requests remaining`;
    }
  } else {
    // No spending data available
    if (remainingRequests <= 0) {
      tooltip += `\n• ⚠️ No fast premium requests remaining`;
    } else if (remainingRequests <= TOTAL_REQUESTS * 0.1) {
      tooltip += `\n• ⚠️ Low on fast premium requests`;
    }
  }

  statusBarItem.tooltip = tooltip;
}

/**
 * Sets the status bar to a generic error state.
 * @param message The message to display. If not provided, a default message is used.
 */
export function setStatusBarError(message?: string) {
  if (!statusBarItem) {
    return;
  }
  const displayMessage = message || "Error";
  statusBarItem.text = `$(error) ${displayMessage}`;
  statusBarItem.backgroundColor = new vscode.ThemeColor(
    "statusBarItem.errorBackground"
  );

  if (displayMessage === "Team ID?") {
    statusBarItem.command = "cursorUsage.openSettings";
    statusBarItem.tooltip = "Click to set your Team ID in settings";
  } else {
    statusBarItem.command = "cursorUsage.refresh";
    statusBarItem.tooltip = "Click to refresh usage data";
  }
}

/**
 * Sets the status bar to a generic warning state.
 * @param message The message to display.
 */
export function setStatusBarWarning(message: string) {
  if (!statusBarItem) {
    return;
  }
  statusBarItem.text = `$(warning) ${message}`;
  statusBarItem.backgroundColor = new vscode.ThemeColor(
    "statusBarItem.warningBackground"
  );

  // If the warning is about setting the cookie, make the status bar item clickable
  // to trigger the cookie insertion command.
  if (message === "Set Cookie") {
    statusBarItem.command = "cursorUsage.insertCookie";
    statusBarItem.tooltip = "Click to set your Cursor session cookie";
  } else {
    // Reset to default refresh command if the warning is something else
    statusBarItem.command = "cursorUsage.refresh";
    statusBarItem.tooltip = "Click to refresh usage data";
  }
}

/**
 * Returns the created status bar item instance.
 * @returns The StatusBarItem instance.
 */
export function getStatusBarItem(): vscode.StatusBarItem {
  return statusBarItem;
}

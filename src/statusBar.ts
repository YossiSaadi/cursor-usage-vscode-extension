import * as vscode from "vscode";

let statusBarItem: vscode.StatusBarItem;

/**
 * Interface for reset information
 */
interface ResetInfo {
  resetDate: Date;
  daysRemaining: number;
  resetDateStr: string;
}

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
 * Updates the status bar with the remaining requests, spending info, reset info, and appropriate color/icon.
 * @param remainingRequests The number of requests left.
 * @param totalRequests The total number of requests allowed in the cycle.
 * @param spendCents The amount spent in cents (optional).
 * @param hardLimitDollars The hard limit in dollars (optional).
 * @param resetInfo Information about when the usage resets (optional).
 */
export function updateStatusBar(
  remainingRequests: number,
  totalRequests: number,
  spendCents?: number,
  hardLimitDollars?: number,
  resetInfo?: ResetInfo
) {
  if (!statusBarItem) {
    return;
  }

  const warningThreshold = totalRequests * 0.1; // 10%
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

  // Determine warning/error states based on spending status
  let shouldShowError = false;
  let shouldShowWarning = false;

  if (spendCents !== undefined && hardLimitDollars !== undefined) {
    // Base colors on spending status (primary display mode)
    shouldShowError = isOverSpendLimit;
    shouldShowWarning = isCloseToSpendLimit && !isOverSpendLimit;
  } else if (remainingRequests > 0) {
    // Fallback to request-based warnings if dollar data not available
    const isLowOnRequests = remainingRequests <= warningThreshold;
    shouldShowWarning = isLowOnRequests;
    shouldShowError = false; // Never error state when requests remain
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

  // Build status text - primary display is dollar-based usage
  let statusText: string;

  if (spendCents !== undefined && hardLimitDollars !== undefined) {
    // Show dollar-based usage: Remaining $X.XX ($Y.YY / $Z.ZZ)
    const remainingDollars = ((hardLimitDollars * 100 - spendCents) / 100).toFixed(2);
    const spendDollars = (spendCents / 100).toFixed(2);
    const limitDollars = hardLimitDollars.toFixed(2);
    statusText = `${icon} Remaining $${remainingDollars} ($${spendDollars} / $${limitDollars})`;
  } else if (remainingRequests > 0) {
    // Fallback to requests if dollar data not available
    statusText = `${icon} ${remainingRequests}`;
  } else {
    // No data available
    statusText = `${icon} 0`;
  }

  statusBarItem.text = statusText;

  // Update tooltip with detailed information
  updateTooltip(
    remainingRequests,
    totalRequests,
    spendCents,
    hardLimitDollars,
    resetInfo
  );
}

/**
 * Updates the tooltip with comprehensive usage, spending, and reset information.
 * @param remainingRequests The number of requests left.
 * @param totalRequests The total number of requests allowed in the cycle.
 * @param spendCents The amount spent in cents (optional).
 * @param hardLimitDollars The hard limit in dollars (optional).
 * @param resetInfo Information about when the usage resets (optional).
 */
function updateTooltip(
  remainingRequests: number,
  totalRequests: number,
  spendCents?: number,
  hardLimitDollars?: number,
  resetInfo?: ResetInfo
) {
  if (!statusBarItem) {
    return;
  }

  // Calculate request percentage only if we have valid request data
  let requestPercentage = "0.0";
  if (totalRequests > 0) {
    const usedRequests = totalRequests - remainingRequests;
    requestPercentage = ((usedRequests / totalRequests) * 100).toFixed(1);
  }

  // Calculate cycle information once if resetInfo is available
  let daysElapsed = 0;
  let dailyUsageRate = 0;
  if (resetInfo && resetInfo.daysRemaining > 0) {
    const startOfCycle = new Date(resetInfo.resetDate);
    startOfCycle.setMonth(startOfCycle.getMonth() - 1); // Go back one month to get start

    const totalCycleDays = Math.ceil(
      (resetInfo.resetDate.getTime() - startOfCycle.getTime()) /
        (1000 * 3600 * 24)
    );
    daysElapsed = totalCycleDays - resetInfo.daysRemaining;

    if (daysElapsed > 0) {
      dailyUsageRate = parseFloat((usedRequests / daysElapsed).toFixed(1));
    }
  }

  let tooltip = "";

  // Add reset information at the top if available
  if (resetInfo) {
    let resetText =
      resetInfo.daysRemaining === 1
        ? `Resets tomorrow (${resetInfo.resetDateStr})`
        : resetInfo.daysRemaining === 0
          ? `Resets today (${resetInfo.resetDateStr})`
          : `Resets in ${resetInfo.daysRemaining} days (${resetInfo.resetDateStr})`;

    // Add daily usage rate to the reset line if available
    if (dailyUsageRate > 0) {
      resetText += ` · ${dailyUsageRate} requests/day avg`;
    }

    tooltip = `${resetText}\n`;

    // Add warning about quota exhaustion if needed
    if (remainingRequests > 0 && dailyUsageRate > 0) {
      const estimatedDaysLeft = Math.ceil(remainingRequests / dailyUsageRate);
      if (estimatedDaysLeft < resetInfo.daysRemaining) {
        tooltip += `⚠️ At current rate, quota exhausted in ~${estimatedDaysLeft} days\n`;
      }
    }

    tooltip += "\n";
  }

  // Add main usage stats - prioritize dollar-based display
  if (spendCents !== undefined && hardLimitDollars !== undefined) {
    const spendDollars = spendCents / 100;
    const spendPercentage = ((spendDollars / hardLimitDollars) * 100).toFixed(
      1
    );
    const remainingDollars = (hardLimitDollars - spendDollars).toFixed(2);

    tooltip += `Usage: $${spendDollars.toFixed(2)} of $${hardLimitDollars.toFixed(2)} limit (${spendPercentage}% used)`;
    tooltip += `\nRemaining budget: $${remainingDollars}`;

    // Add warnings based on spending status
    if (spendDollars >= hardLimitDollars) {
      tooltip += `\n⚠️ Spend limit reached`;
    } else if (spendDollars / hardLimitDollars >= 0.8) {
      tooltip += `\n⚠️ Approaching spend limit`;
    }

    // Add request stats if available (for reference)
    if (remainingRequests > 0 && totalRequests > 0) {
      tooltip += `\n\nFast Premium Requests: ${remainingRequests}/${totalRequests} remaining (${requestPercentage}% used)`;
    }
  } else {
    // Fallback to request-based display if dollar data not available
    tooltip += `Fast Premium Requests: ${remainingRequests}/${totalRequests} remaining (${requestPercentage}% used)`;
    if (remainingRequests <= 0) {
      tooltip += `\n⚠️ No requests remaining`;
    } else if (remainingRequests <= totalRequests * 0.1) {
      tooltip += `\n⚠️ Low on requests`;
    }
  }

  tooltip += `\n\nClick to refresh`;

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

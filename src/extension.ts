import * as vscode from "vscode";
import { registerSummaryToolCommands } from "./tools/summary-tool/commands";

// Extension activation
export function activate(context: vscode.ExtensionContext) {
  console.log("Htool extension is now active!");

  try {
    // Register summary tool commands
    registerSummaryToolCommands(context);

    // Show welcome message on first activation
    const isFirstActivation = context.globalState.get(
      "htool.firstActivation",
      true
    );
    if (isFirstActivation) {
      showWelcomeMessage();
      context.globalState.update("htool.firstActivation", false);
    }

    console.log("Htool extension activated successfully");
  } catch (error) {
    console.error("Error activating Htool extension:", error);
    vscode.window.showErrorMessage(
      `Failed to activate Htool extension: ${error}`
    );
  }
}

// Extension deactivation
export function deactivate() {
  console.log("Htool extension is being deactivated");
  // Cleanup will be handled by disposal of context subscriptions
}

// Helper functions
function showWelcomeMessage() {
  const message = "Welcome to Htool! 🎉";

  const openDocs = "Open Documentation";
  const openSettings = "Open Settings";

  vscode.window
    .showInformationMessage(message, openDocs, openSettings)
    .then((selection) => {
      if (selection === openDocs) {
        // Open documentation (you can add a README link here)
        vscode.env.openExternal(
          // TODO: Replace with your actual documentation URL
          vscode.Uri.parse("https://github.com/your-username/htool")
        );
      } else if (selection === openSettings) {
        vscode.commands.executeCommand(
          "workbench.action.openSettings",
          "htool"
        );
      }
    });
}

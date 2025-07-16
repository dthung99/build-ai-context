import * as vscode from "vscode";
import { registerSummaryToolCommands } from "./tools/summary-tool/commands";

// Extension activation
export function activate(context: vscode.ExtensionContext) {
  console.log("Build AI Context extension is now active!");

  try {
    // Register summary tool commands
    registerSummaryToolCommands(context);

    // Show welcome message on first activation
    const isFirstActivation = context.globalState.get(
      "build-ai-context.firstActivation",
      true
    );
    if (isFirstActivation) {
      showWelcomeMessage();
      context.globalState.update("build-ai-context.firstActivation", false);
    }

    console.log("Build AI Context extension activated successfully");
  } catch (error) {
    console.error("Error activating Build AI Context extension:", error);
    vscode.window.showErrorMessage(
      `Failed to activate Build AI Context extension: ${error}`
    );
  }
}

// Extension deactivation
export function deactivate() {
  console.log("Build AI Context extension is being deactivated");
  // Cleanup will be handled by disposal of context subscriptions
}

// Helper functions
function showWelcomeMessage() {
  const message = "Welcome to Build AI Context! 🎉";

  const openDocs = "Open Documentation";
  const openSettings = "Open Settings";

  vscode.window
    .showInformationMessage(message, openDocs, openSettings)
    .then((selection) => {
      if (selection === openDocs) {
        // Open documentation (you can add a README link here)
        vscode.env.openExternal(
          vscode.Uri.parse("https://github.com/dthung99/build-ai-context")
        );
      } else if (selection === openSettings) {
        vscode.commands.executeCommand(
          "workbench.action.openSettings",
          "build-ai-context"
        );
      }
    });
}

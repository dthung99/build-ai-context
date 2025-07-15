import * as path from "path";
import * as vscode from "vscode";
import { SummaryResult } from "../models/types";
import { ConfigManager } from "../services/configManager";
import { FileTracker } from "../services/fileTracker";
import { StructureSummarizer } from "../services/structureSummarizer";
import { PathUtils } from "../utils/pathUtils";

export class SummaryCommand {
  private configManager: ConfigManager;

  constructor() {
    this.configManager = ConfigManager.getInstance();
  }

  public async execute(): Promise<void> {
    try {
      // Check if workspace is open
      this.configManager.refreshConfig();
      const workspacePath = this.configManager.getWorkspacePath();
      if (!workspacePath) {
        vscode.window.showErrorMessage("No workspace folder is open");
        return;
      }

      // Get or prompt for target folder
      const targetFolder = await this.getTargetFolder();
      if (!targetFolder) {
        return; // User cancelled
      }

      // Check if target folder empty
      if (!PathUtils.isDirectoryEmpty(targetFolder)) {
        const confirm = await vscode.window.showInformationMessage(
          "Target folder is not empty. Do you want to proceed?",
          { modal: true },
          "Delete Files And Proceed",
          "Proceed"
        );

        if (confirm === "Proceed") {
          // User chose to proceed without deleting
          vscode.window.setStatusBarMessage(
            "Proceeding with existing files in target folder."
          );
        }

        if (confirm === "Delete Files And Proceed") {
          vscode.window.setStatusBarMessage(
            "Deleting existing files in target folder and proceeding."
          );
          PathUtils.deleteFilesInDirectory(targetFolder);
        }

        if (!confirm) {
          return; // User cancelled
        }
      }

      // Show progress and execute summary
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Summarizing Project",
          cancellable: false,
        },
        async (progress) => {
          const result = await this.performSummary(
            workspacePath,
            targetFolder,
            progress
          );
          await this.showResults(result);
        }
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Error during project summary: ${error}`);
      console.error("Summary command error:", error);
    }
  }

  private async getTargetFolder(): Promise<string | null> {
    try {
      const config = this.configManager.getConfig();

      // TODO: It's asking the user to choose but not saving their choice.
      if (config.targetFolder && PathUtils.exists(config.targetFolder)) {
        // Ask user if they want to use existing target folder
        const useExisting = await vscode.window.showQuickPick(
          [
            {
              label: "Use existing target folder",
              description: config.targetFolder,
              target: config.targetFolder,
            },
            {
              label: "Choose new target folder",
              description: "Select a different location",
              target: null,
            },
          ],
          {
            placeHolder: "Select target folder for summary output",
            ignoreFocusOut: true,
          }
        );

        if (!useExisting) {
          return null; // User cancelled
        }

        if (useExisting.target === null) {
          return await this.configManager.showSelectTargetFolderDialog();
        }

        return useExisting.target;
      }

      // Prompt for new target folder
      return await this.configManager.showSelectTargetFolderDialog();
    } catch (error) {
      console.error("Error getting target folder:", error);
      return null;
    }
  }

  private async performSummary(
    workspacePath: string,
    targetFolder: string,
    progress: vscode.Progress<{ message?: string; increment?: number }>
  ): Promise<SummaryResult> {
    const config = this.configManager.getConfig();

    // Initialize services
    const structureSummarizer = new StructureSummarizer(config.ignoreStructure);
    const fileTracker = new FileTracker(config.untrack);

    // Set progress reporters
    structureSummarizer.setProgress(progress);
    fileTracker.setProgress(progress);

    // Phase 1: Generate structure summary
    progress.report({
      message: "Generating project structure...",
      increment: 0,
    });

    const structure = await structureSummarizer.generateStructure({
      workspacePath,
      ignoreStructurePatterns: config.ignoreStructure,
    });

    progress.report({ message: "Structure analysis complete", increment: 30 });

    // Phase 2: Track and copy files
    progress.report({ message: "Processing tracked files...", increment: 30 });

    const fileResults = await fileTracker.trackAndCopyFiles({
      workspacePath,
      // TODO: Use it from the config
      targetPath: targetFolder,
      trackPatterns: config.track,
      untrackPatterns: config.untrack,
    });

    progress.report({ message: "File copying complete", increment: 60 });

    // Phase 3: Save structure summary to file
    progress.report({ message: "Saving structure summary...", increment: 80 });

    const structureFilePath = path.join(targetFolder, "project_structure.txt");
    await structureSummarizer.saveStructureToFile(structure, structureFilePath);

    progress.report({ message: "All steps finished!", increment: 100 });

    return {
      structure,
      trackedFiles: fileResults.trackedFiles,
      copiedFiles: fileResults.copiedFiles,
      skippedFiles: fileResults.skippedFiles,
      totalFiles: fileResults.totalFiles,
      targetPath: targetFolder,
    };
  }

  private async showResults(result: SummaryResult): Promise<void> {
    const message =
      `🎉 Project summary completed! ` +
      `Files copied: ${result.copiedFiles}, ` +
      `Files skipped: ${result.skippedFiles}, ` +
      `Total files: ${result.totalFiles}.`;

    const openFolder = "Open Output Folder";
    const openStructure = "Open Structure File";

    const action = await vscode.window.showInformationMessage(
      message,
      openFolder,
      openStructure
    );

    if (action === openFolder) {
      await vscode.env.openExternal(vscode.Uri.file(result.targetPath));
    } else if (action === openStructure) {
      const structurePath = path.join(
        result.targetPath,
        "project_structure.txt"
      );
      await vscode.commands.executeCommand(
        "vscode.open",
        vscode.Uri.file(structurePath)
      );
    }
  }
}

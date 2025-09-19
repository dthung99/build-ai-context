import * as path from "path";
import * as vscode from "vscode";
import { SummaryResult } from "../models/types";
import { ConfigManager } from "../services/configManager";
import { FileTracker } from "../services/fileTracker";
import { StructureSummarizer } from "../services/structureSummarizer";
import { PathUtils } from "../utils/pathUtils";

export class SummaryOneFileCommand {
  private configManager: ConfigManager;

  constructor() {
    this.configManager = ConfigManager.getInstance();
  }

  public async execute(): Promise<void> {
    try {
      // Check if workspace is open
      const workspacePath = this.configManager.getWorkspacePath();
      if (!workspacePath) {
        vscode.window.showErrorMessage("No workspace folder is open");
        return;
      }

      // Get or prompt for target folder
      let targetFolder = await this.getTargetFolder();
      if (
        targetFolder !== null &&
        targetFolder !== "" &&
        PathUtils.exists(targetFolder)
      ) {
        // Ask user if they want to use existing target folder
        const useExisting = await vscode.window.showQuickPick(
          [
            {
              label: "Use existing target folder",
              description: targetFolder,
              target: targetFolder,
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
          return; // User cancelled
        }

        if (useExisting.target === null) {
          targetFolder =
            await this.configManager.showSelectTargetFolderDialog();
        }
      } else {
        targetFolder = await this.configManager.showSelectTargetFolderDialog();
      }

      if (!targetFolder) {
        return; // User cancelled
      }

      // Show progress and execute summary
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Generating Single File Summary",
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
      console.error("Summary one file command error:", error);
    }
  }

  private getTargetFolder(): string | null {
    try {
      const config = this.configManager.getConfig();
      return config.targetFolder;
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

    const outputFilePath = path.join(targetFolder, "project_structure.txt");
    await structureSummarizer.saveStructureToFile(structure, outputFilePath);

    progress.report({ message: "Structure analysis complete", increment: 30 });

    // Phase 2: Append tracked files content
    progress.report({ message: "Processing tracked files...", increment: 30 });

    const fileResults = await fileTracker.trackAndWriteToSingleFile({
      workspacePath,
      targetPath: outputFilePath,
      trackPatterns: config.track,
      untrackPatterns: config.untrack,
    });

    progress.report({
      message: "Single file generation complete!",
      increment: 100,
    });

    return {
      structure,
      trackedFiles: fileResults.trackedFiles,
      copiedFiles: 1, // We generated 1 combined file
      skippedFiles: 0,
      totalFiles: fileResults.totalFiles,
      targetPath: outputFilePath,
    };
  }

  private async showResults(result: SummaryResult): Promise<void> {
    const message =
      `🎉 Single file summary completed! ` +
      `Generated 1 combined file with ${result.totalFiles} files included.`;

    const openFile = "Open Combined File";
    const openFolder = "Open Output Folder";

    const action = await vscode.window.showInformationMessage(
      message,
      openFile,
      openFolder
    );

    if (action === openFile) {
      await vscode.commands.executeCommand(
        "vscode.open",
        vscode.Uri.file(result.targetPath)
      );
    } else if (action === openFolder) {
      const folderPath = PathUtils.getDirName(result.targetPath);
      await vscode.env.openExternal(vscode.Uri.file(folderPath));
    }
  }
}

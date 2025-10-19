import * as path from "path";
import * as vscode from "vscode";
import { OUTPUT_FILES, LABELS, MESSAGES, PROGRESS } from "../constants";
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
      const workspacePath = this.configManager.getWorkspacePath();
      if (!workspacePath) {
        vscode.window.showErrorMessage(MESSAGES.NO_WORKSPACE);
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
              label: LABELS.USE_EXISTING_FOLDER,
              description: targetFolder,
              target: targetFolder,
            },
            {
              label: LABELS.CHOOSE_NEW_FOLDER,
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

      // Check if target folder empty
      if (!PathUtils.isDirectoryEmpty(targetFolder)) {
        const confirm = await vscode.window.showInformationMessage(
          MESSAGES.FOLDER_NOT_EMPTY,
          { modal: true },
          LABELS.DELETE_AND_PROCEED,
          LABELS.PROCEED
        );

        if (confirm === LABELS.PROCEED) {
          // User chose to proceed without deleting
          vscode.window.setStatusBarMessage(
            "Proceeding with existing files in target folder."
          );
        }

        if (confirm === LABELS.DELETE_AND_PROCEED) {
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
      message: PROGRESS.GENERATING_STRUCTURE,
      increment: 0,
    });

    const structure = await structureSummarizer.generateStructure({
      workspacePath,
      ignoreStructurePatterns: config.ignoreStructure,
    });

    const structureFilePath = path.join(targetFolder, OUTPUT_FILES.PROJECT_STRUCTURE);
    await structureSummarizer.saveStructureToFile(structure, structureFilePath);

    progress.report({ message: PROGRESS.STRUCTURE_COMPLETE, increment: 30 });

    // Phase 2: Track and copy files
    progress.report({ message: PROGRESS.PROCESSING_FILES, increment: 30 });

    const fileResults = await fileTracker.trackAndCopyFiles({
      workspacePath,
      targetPath: targetFolder,
      trackPatterns: config.track,
      untrackPatterns: config.untrack,
    });

    progress.report({ message: PROGRESS.COPYING_COMPLETE, increment: 60 });

    // Phase 3: Save structure summary to file
    progress.report({ message: PROGRESS.SAVING_STRUCTURE, increment: 80 });

    progress.report({ message: PROGRESS.ALL_FINISHED, increment: 100 });

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

    const action = await vscode.window.showInformationMessage(
      message,
      LABELS.OPEN_FOLDER,
      LABELS.OPEN_STRUCTURE
    );

    const targetPath = (await this.getTargetFolder()) ?? "";

    if (action === LABELS.OPEN_FOLDER) {
      await vscode.env.openExternal(vscode.Uri.file(targetPath));
    } else if (action === LABELS.OPEN_STRUCTURE) {
      const structurePath = path.join(targetPath, OUTPUT_FILES.PROJECT_STRUCTURE);
      await vscode.commands.executeCommand(
        "vscode.open",
        vscode.Uri.file(structurePath)
      );
    }
  }
}

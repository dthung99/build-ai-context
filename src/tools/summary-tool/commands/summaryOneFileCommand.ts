import * as path from "path";
import * as vscode from "vscode";
import { LABELS, MESSAGES, OUTPUT_FILES, PROGRESS } from "../constants";
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
        vscode.window.showErrorMessage(MESSAGES.NO_WORKSPACE);
        return;
      }

      // Get or prompt for target folder
      let targetFolder = await this.configManager.getTargetFolder();
      const defaultTargetFolder =
        this.configManager.getDefaultTargetFolderPath();

      // Pick options
      const pickOptions: {
        label: string;
        description: string;
        target: string | null;
      }[] = [
        {
          label: LABELS.USE_GLOBAL_CONFIG_FOLDER,
          description: defaultTargetFolder,
          target: defaultTargetFolder,
        },
        {
          label: LABELS.CHOOSE_NEW_FOLDER,
          description: "Select a different location",
          target: null,
        },
      ];

      if (
        targetFolder !== null &&
        targetFolder !== "" &&
        PathUtils.exists(targetFolder)
      ) {
        pickOptions.unshift({
          label: LABELS.USE_EXISTING_FOLDER,
          description: targetFolder,
          target: targetFolder,
        });
      }

      // Ask user if they want to use existing target folder
      const useExisting = await vscode.window.showQuickPick(pickOptions, {
        placeHolder: "Select target folder for summary output",
        ignoreFocusOut: true,
      });

      if (!useExisting) {
        return; // User cancelled
      }

      if (useExisting.target === null) {
        targetFolder = await this.configManager.showSelectTargetFolderDialog();
      }

      if (useExisting.target === defaultTargetFolder) {
        targetFolder =
          await this.configManager.updateTargetFolderToDefaultFolder();
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
          void this.showResults(result);
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
      message: PROGRESS.GENERATING_STRUCTURE,
      increment: 0,
    });

    const structure = await structureSummarizer.generateStructure({
      workspacePath,
      ignoreStructurePatterns: config.ignoreStructure,
    });

    // Save structure to separate JSON file
    const structureFilePath = path.join(
      targetFolder,
      OUTPUT_FILES.PROJECT_STRUCTURE
    );
    await structureSummarizer.saveStructureToFile(structure, structureFilePath);

    progress.report({ message: PROGRESS.STRUCTURE_COMPLETE, increment: 30 });

    // Phase 2: Append tracked files content to separate file
    progress.report({ message: PROGRESS.PROCESSING_FILES, increment: 30 });

    const combinedFilePath = path.join(
      targetFolder,
      OUTPUT_FILES.COMBINED_FILES
    );
    const fileResults = await fileTracker.trackAndWriteToSingleFile({
      workspacePath,
      targetPath: combinedFilePath,
      trackPatterns: config.track,
      untrackPatterns: config.untrack,
    });

    progress.report({
      message: PROGRESS.GENERATION_COMPLETE,
      increment: 100,
    });

    return {
      structure,
      trackedFiles: fileResults.trackedFiles,
      copiedFiles: 2, // We generated structure.json + combined_files.txt
      skippedFiles: 0,
      totalFiles: fileResults.totalFiles,
      targetPath: combinedFilePath,
    };
  }

  private async showResults(result: SummaryResult): Promise<void> {
    const message =
      `🎉 Single file summary completed! ` +
      `Generated structure.json and combined ${result.totalFiles} files.`;

    const action = await vscode.window.showInformationMessage(
      message,
      LABELS.OPEN_COMBINED_FILE,
      LABELS.OPEN_STRUCTURE,
      LABELS.OPEN_FOLDER
    );

    if (action === LABELS.OPEN_COMBINED_FILE) {
      await vscode.commands.executeCommand(
        "vscode.open",
        vscode.Uri.file(result.targetPath)
      );
    } else if (action === LABELS.OPEN_STRUCTURE) {
      const folderPath = PathUtils.getDirName(result.targetPath);
      const structurePath = path.join(
        folderPath,
        OUTPUT_FILES.PROJECT_STRUCTURE
      );
      await vscode.commands.executeCommand(
        "vscode.open",
        vscode.Uri.file(structurePath)
      );
    } else if (action === LABELS.OPEN_FOLDER) {
      const folderPath = PathUtils.getDirName(result.targetPath);
      await vscode.env.openExternal(vscode.Uri.file(folderPath));
    }
  }
}

import * as vscode from "vscode";
import { SummaryToolCommand } from "../models/types";
import { ConfigManager } from "../services/configManager";
import { PathUtils } from "../utils/pathUtils";

export class ContextMenuSummaryCommands {
  private configManager: ConfigManager;

  constructor() {
    this.configManager = ConfigManager.getInstance();
  }

  public async track(uri?: vscode.Uri): Promise<void> {
    try {
      if (!uri) {
        vscode.window.showErrorMessage("No item selected for tracking");
        return;
      }

      const itemPath = PathUtils.uriToPath(uri);

      // Check if it's untrack
      if (this.configManager.isItemUntracked(itemPath)) {
        await this.configManager.removeFromUntrack(itemPath);
        vscode.window.showInformationMessage(
          "Item was removed from untrack list, run again to track it."
        );
        return;
      }

      // Add to tracking
      await this.configManager.addToTrack(itemPath);

      const relativePath = PathUtils.getRelativePathFromWorkspace(itemPath);
      const stats = await PathUtils.getFileStats(itemPath);
      const itemType = stats?.isFile() ? "file" : "folder";

      vscode.window.showInformationMessage(
        `Added ${itemType} to tracking: ${relativePath}`
      );

      // Remove from untrack if it was previously untracked
      await this.configManager.removeFromUntrack(itemPath);
    } catch (error) {
      vscode.window.showErrorMessage(`Error tracking item: ${error}`);
      console.error("Track item error:", error);
    }
  }

  public async untrack(uri?: vscode.Uri): Promise<void> {
    try {
      if (!uri) {
        vscode.window.showErrorMessage("No item selected for untracking");
        return;
      }

      const itemPath = PathUtils.uriToPath(uri);

      // Check if it's already tracked
      if (this.configManager.isItemTracked(itemPath)) {
        await this.configManager.removeFromTrack(itemPath);
        vscode.window.showInformationMessage(
          "Item was removed from track list, run again to untrack it."
        );
        return;
      }

      const relativePath = PathUtils.getRelativePathFromWorkspace(itemPath);
      const stats = await PathUtils.getFileStats(itemPath);
      const itemType = stats?.isFile() ? "file" : "folder";

      await this.configManager.addToUntrack(itemPath);
      vscode.window.showInformationMessage(
        `Removed ${itemType} from tracking: ${relativePath}`
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Error untracking item: ${error}`);
      console.error("Untrack item error:", error);
    }
  }

  public async toggleIgnoreStructure(uri?: vscode.Uri): Promise<void> {
    try {
      if (!uri) {
        vscode.window.showErrorMessage(
          "No folder selected for ignoring structure"
        );
        return;
      }

      const itemPath = PathUtils.uriToPath(uri);

      // Add to ignore structure
      await this.configManager.toggleIgnoreStructure(itemPath);
    } catch (error) {
      vscode.window.showErrorMessage(`Error ignoring structure: ${error}`);
      console.error("Ignore structure error:", error);
    }
  }

  public async isItemInIgnoreList(uri?: vscode.Uri): Promise<boolean> {
    if (!uri) {
      return false;
    }
    const itemPath = PathUtils.uriToPath(uri);
    const ignoreList = this.configManager.getConfig().ignoreStructure;
    const relativePath = PathUtils.getRelativePathFromWorkspace(itemPath);
    return ignoreList.includes(relativePath);
  }

  public async clearAllTracking(): Promise<void> {
    try {
      const confirm = await vscode.window.showWarningMessage(
        "This will clear all tracking, untrack, and ignore structure settings. Are you sure?",
        { modal: true },
        "Clear All"
      );

      if (confirm !== "Clear All") {
        return;
      }

      // Clear all settings
      await this.configManager.updateTargetFolder("");
      await vscode.workspace
        .getConfiguration()
        .update(
          SummaryToolCommand.ADD_TRACK,
          [],
          vscode.ConfigurationTarget.Workspace
        );
      await vscode.workspace
        .getConfiguration()
        .update(
          SummaryToolCommand.ADD_UNTRACK,
          [],
          vscode.ConfigurationTarget.Workspace
        );
      await vscode.workspace
        .getConfiguration()
        .update(
          "htool.summary-tool.ignore-structure",
          [],
          vscode.ConfigurationTarget.Workspace
        );
    } catch (error) {
      vscode.window.showErrorMessage(`Error clearing tracking: ${error}`);
      console.error("Clear tracking error:", error);
    }
  }
}

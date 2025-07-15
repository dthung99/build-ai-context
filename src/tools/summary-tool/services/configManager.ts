import * as path from "path";
import * as vscode from "vscode";
import { ConfigKey, SummaryToolConfig } from "../models/types";

export class ConfigManager {
  private static instance: ConfigManager;
  private workspaceConfig: vscode.WorkspaceConfiguration;

  private constructor() {
    this.workspaceConfig = vscode.workspace.getConfiguration();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
      ConfigManager.instance.refreshConfig();
    }
    return ConfigManager.instance;
  }

  public getConfig(): SummaryToolConfig {
    return {
      targetFolder:
        this.workspaceConfig.get<string>(ConfigKey.TARGET_FOLDER) || "",
      track: this.workspaceConfig.get<string[]>(ConfigKey.TRACK) || [],
      untrack: this.workspaceConfig.get<string[]>(ConfigKey.UNTRACK) || [
        // TODO: consider rm later
        "node_modules",
        ".git",
        ".vscode",
        "dist",
        "build",
        "out",
        ".next",
        "coverage",
        "*.log",
        ".DS_Store",
        "Thumbs.db",
      ],
      ignoreStructure: this.workspaceConfig.get<string[]>(
        ConfigKey.IGNORE_STRUCTURE
      ) || [
        // TODO: consider rm later
        "node_modules",
        ".git",
        "dist",
        "build",
        "out",
        ".next",
        "coverage",
      ],
    };
  }

  public async updateTargetFolder(targetFolder: string): Promise<void> {
    await this.workspaceConfig.update(
      ConfigKey.TARGET_FOLDER,
      targetFolder,
      vscode.ConfigurationTarget.Workspace
    );
  }

  public async addToTrack(itemPath: string): Promise<void> {
    const currentTrack = this.getConfig().track;
    const workspacePath = this.getWorkspacePath();

    if (!workspacePath) {
      throw new Error("No workspace folder is open");
    }

    const relativePath = path.relative(workspacePath, itemPath);

    if (!currentTrack.includes(relativePath)) {
      const updatedTrack = [...currentTrack, relativePath];
      await this.workspaceConfig.update(
        ConfigKey.TRACK,
        updatedTrack,
        vscode.ConfigurationTarget.Workspace
      );
    }
    this.refreshConfig();
  }

  public async addToUntrack(itemPath: string): Promise<void> {
    const currentUntrack = this.getConfig().untrack;
    const workspacePath = this.getWorkspacePath();

    if (!workspacePath) {
      throw new Error("No workspace folder is open");
    }

    const relativePath = path.relative(workspacePath, itemPath);

    // Add to untrack if not already present
    if (!currentUntrack.includes(relativePath)) {
      const updatedUntrack = [...currentUntrack, relativePath];
      await this.workspaceConfig.update(
        ConfigKey.UNTRACK,
        updatedUntrack,
        vscode.ConfigurationTarget.Workspace
      );
    }
    this.refreshConfig();
  }

  public async removeFromTrack(itemPath: string): Promise<void> {
    const currentTrack = this.getConfig().track;
    const workspacePath = this.getWorkspacePath();

    if (!workspacePath) {
      throw new Error("No workspace folder is open");
    }

    const relativePath = path.relative(workspacePath, itemPath);
    const updatedTrack = currentTrack.filter((item) => item !== relativePath);

    await this.workspaceConfig.update(
      ConfigKey.TRACK,
      updatedTrack,
      vscode.ConfigurationTarget.Workspace
    );

    this.refreshConfig();
  }

  public async removeFromUntrack(itemPath: string): Promise<void> {
    const currentUntrack = this.getConfig().untrack;
    const workspacePath = this.getWorkspacePath();

    if (!workspacePath) {
      throw new Error("No workspace folder is open");
    }

    const relativePath = path.relative(workspacePath, itemPath);
    const updatedUntrack = currentUntrack.filter(
      (item) => item !== relativePath
    );

    await this.workspaceConfig.update(
      ConfigKey.UNTRACK,
      updatedUntrack,
      vscode.ConfigurationTarget.Workspace
    );

    this.refreshConfig();
  }

  public async toggleIgnoreStructure(itemPath: string): Promise<void> {
    const currentIgnoreStructure = this.getConfig().ignoreStructure;
    const workspacePath = this.getWorkspacePath();

    if (!workspacePath) {
      throw new Error("No workspace folder is open");
    }

    const relativePath = path.relative(workspacePath, itemPath);

    if (currentIgnoreStructure.includes(relativePath)) {
      // Remove from ignore structure
      const updatedIgnoreStructure = currentIgnoreStructure.filter(
        (item) => item !== relativePath
      );
      await this.workspaceConfig.update(
        ConfigKey.IGNORE_STRUCTURE,
        updatedIgnoreStructure,
        vscode.ConfigurationTarget.Workspace
      );
      vscode.window.showInformationMessage(
        `Removed folder from ignore structure: ${relativePath}`
      );
    } else {
      const updatedIgnoreStructure = [...currentIgnoreStructure, relativePath];
      await this.workspaceConfig.update(
        ConfigKey.IGNORE_STRUCTURE,
        updatedIgnoreStructure,
        vscode.ConfigurationTarget.Workspace
      );
      vscode.window.showInformationMessage(
        `Added folder to ignore structure: ${relativePath}`
      );
    }
    this.refreshConfig();
  }

  public async showSelectTargetFolderDialog(): Promise<string> {
    // If no target folder is set, prompt user to select one
    const workspacePath = this.getWorkspacePath();
    const selectedUri = await vscode.window.showOpenDialog({
      defaultUri: workspacePath ? vscode.Uri.file(workspacePath) : undefined,
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: "Select Summary Output Folder",
    });

    if (!selectedUri || selectedUri.length === 0) {
      throw new Error("No target folder selected");
    }

    const targetFolder = selectedUri[0].fsPath;
    await this.updateTargetFolder(targetFolder);
    this.refreshConfig();
    return targetFolder;
  }

  public async resetAllConfig(): Promise<void> {
    try {
      const clearButton = "Clear All";
      const confirm = await vscode.window.showWarningMessage(
        "This will clear all tracking, untrack, and ignore structure settings. Are you sure?",
        { modal: true },
        clearButton
      );

      if (confirm !== clearButton) {
        return;
      }

      // Clear all settings
      await this.updateTargetFolder("");
      await this.workspaceConfig.update(
        ConfigKey.TRACK,
        undefined,
        vscode.ConfigurationTarget.Workspace
      );
      await this.workspaceConfig.update(
        ConfigKey.UNTRACK,
        undefined,
        vscode.ConfigurationTarget.Workspace
      );
      await this.workspaceConfig.update(
        ConfigKey.IGNORE_STRUCTURE,
        undefined,
        vscode.ConfigurationTarget.Workspace
      );

      // Refresh configuration
      this.refreshConfig();
    } catch (error) {
      vscode.window.showErrorMessage(`Error clearing tracking: ${error}`);
      console.error("Clear tracking error:", error);
    }
  }

  public getWorkspacePath(): string | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    return workspaceFolders?.[0]?.uri.fsPath;
  }

  public refreshConfig(): void {
    this.workspaceConfig = vscode.workspace.getConfiguration();
  }

  public isItemTracked(itemPath: string): boolean {
    const config = this.getConfig();
    const workspacePath = this.getWorkspacePath();

    if (!workspacePath) {
      return false;
    }

    const relativePath = path.relative(workspacePath, itemPath);
    return config.track.includes(relativePath);
  }

  public isItemUntracked(itemPath: string): boolean {
    const config = this.getConfig();
    const workspacePath = this.getWorkspacePath();

    if (!workspacePath) {
      return false;
    }

    const relativePath = path.relative(workspacePath, itemPath);
    return config.untrack.includes(relativePath);
  }
}

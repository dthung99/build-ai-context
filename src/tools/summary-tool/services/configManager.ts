import * as path from "path";
import * as vscode from "vscode";
import { ConfigKey, SummaryToolConfig } from "../models/types";

export class ConfigManager {
  private static instance: ConfigManager;

  private constructor() {}

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  public getConfig(): SummaryToolConfig {
    const config = vscode.workspace.getConfiguration();
    return {
      targetFolder: config.get<string>(ConfigKey.TARGET_FOLDER) || "",
      track: config.get<string[]>(ConfigKey.TRACK) || [],
      untrack: config.get<string[]>(ConfigKey.UNTRACK) || [],
      ignoreStructure: config.get<string[]>(ConfigKey.IGNORE_STRUCTURE) || [],
    };
  }

  public async updateTargetFolder(targetFolder: string): Promise<void> {
    await vscode.workspace
      .getConfiguration()
      .update(
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
      await vscode.workspace
        .getConfiguration()
        .update(
          ConfigKey.TRACK,
          updatedTrack,
          vscode.ConfigurationTarget.Workspace
        );
    }
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
      await vscode.workspace
        .getConfiguration()
        .update(
          ConfigKey.UNTRACK,
          updatedUntrack,
          vscode.ConfigurationTarget.Workspace
        );
    }
  }

  public async removeFromTrack(itemPath: string): Promise<void> {
    const currentTrack = this.getConfig().track;
    const workspacePath = this.getWorkspacePath();

    if (!workspacePath) {
      throw new Error("No workspace folder is open");
    }

    const relativePath = path.relative(workspacePath, itemPath);
    const updatedTrack = currentTrack.filter((item) => item !== relativePath);

    await vscode.workspace
      .getConfiguration()
      .update(
        ConfigKey.TRACK,
        updatedTrack,
        vscode.ConfigurationTarget.Workspace
      );
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

    await vscode.workspace
      .getConfiguration()
      .update(
        ConfigKey.UNTRACK,
        updatedUntrack,
        vscode.ConfigurationTarget.Workspace
      );
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
      await vscode.workspace
        .getConfiguration()
        .update(
          ConfigKey.IGNORE_STRUCTURE,
          updatedIgnoreStructure,
          vscode.ConfigurationTarget.Workspace
        );
      vscode.window.showInformationMessage(
        `Removed folder from ignore structure: ${relativePath}`
      );
    } else {
      const updatedIgnoreStructure = [...currentIgnoreStructure, relativePath];
      await vscode.workspace
        .getConfiguration()
        .update(
          ConfigKey.IGNORE_STRUCTURE,
          updatedIgnoreStructure,
          vscode.ConfigurationTarget.Workspace
        );
      vscode.window.showInformationMessage(
        `Added folder to ignore structure: ${relativePath}`
      );
    }
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
    return targetFolder;
  }

  public async resetAllConfig(): Promise<void> {
    const config = vscode.workspace.getConfiguration();

    // Set to undefined to remove workspace overrides (revert to defaults)
    await Promise.all([
      config.update(
        ConfigKey.TRACK,
        undefined,
        vscode.ConfigurationTarget.Workspace
      ),
      config.update(
        ConfigKey.UNTRACK,
        undefined,
        vscode.ConfigurationTarget.Workspace
      ),
      config.update(
        ConfigKey.IGNORE_STRUCTURE,
        undefined,
        vscode.ConfigurationTarget.Workspace
      ),
      config.update(
        ConfigKey.TARGET_FOLDER,
        undefined,
        vscode.ConfigurationTarget.Workspace
      ),
    ]);
  }

  public getWorkspacePath(): string | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    return workspaceFolders?.[0]?.uri.fsPath;
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

import * as vscode from "vscode";

export interface SummaryToolConfig {
  targetFolder: string;
  track: string[];
  untrack: string[];
  ignoreStructure: string[];
}

export interface FolderNode {
  name: string;
  path: string;
  isFile: boolean;
  children: { [key: string]: FolderNode | null };
  isIgnored?: boolean; // Used for structure summary - shows parent but not children
}

export interface SummaryResult {
  structure: FolderNode;
  trackedFiles: string[];
  copiedFiles: number;
  skippedFiles: number;
  totalFiles: number;
  targetPath: string;
}

export interface TrackingItem {
  path: string;
  relativePath: string;
  isFile: boolean;
  isTracked: boolean;
}

export interface StructureSummaryOptions {
  workspacePath: string;
  ignoreStructurePatterns: string[];
}

export interface FileTrackingOptions {
  workspacePath: string;
  targetPath: string;
  trackPatterns: string[];
  untrackPatterns: string[];
}

export interface ExclusionMatchResult {
  shouldExclude: boolean;
  matchedPattern?: string;
}

export interface ProgressReporter {
  report(value: { message?: string; increment?: number }): void;
}

export interface CommandContext {
  uri?: vscode.Uri;
  progress?: ProgressReporter;
}

export const PKG_NAME = "build-ai-context.summary-tool";

export enum SummaryToolCommand {
  SUMMARIZE = PKG_NAME + ".summarize",
  SUMMARIZE_ONE_FILE = PKG_NAME + ".summarize-one-file",
  ADD_TRACK = PKG_NAME + ".track",
  ADD_UNTRACK = PKG_NAME + ".untrack",
  IGNORE_STRUCTURE = PKG_NAME + ".ignore-structure",
  RESET = PKG_NAME + ".reset",
}

export enum ConfigKey {
  TARGET_FOLDER = PKG_NAME + ".target-folder",
  TRACK = PKG_NAME + ".track",
  UNTRACK = PKG_NAME + ".untrack",
  IGNORE_STRUCTURE = PKG_NAME + ".ignore-structure",
}

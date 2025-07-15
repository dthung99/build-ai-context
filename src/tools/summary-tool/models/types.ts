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

export enum SummaryToolCommand {
  SUMMARIZE = "htool.summary-tool.summarize",
  ADD_TRACK = "htool.summary-tool.track",
  ADD_UNTRACK = "htool.summary-tool.untrack",
  IGNORE_STRUCTURE = "htool.summary-tool.ignore-structure",
  CLEAR_TRACKING = "htool.summary-tool.clear-tracking",
}

export enum ConfigKey {
  TARGET_FOLDER = "htool.summary-tool.target-folder",
  TRACK = "htool.summary-tool.track",
  UNTRACK = "htool.summary-tool.untrack",
  IGNORE_STRUCTURE = "htool.summary-tool.ignore-structure",
}

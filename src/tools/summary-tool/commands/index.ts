import * as vscode from "vscode";
import { SummaryToolCommand } from "../models/types";
import { ContextMenuSummaryCommands } from "./contextMenuCommands";
import { SummaryCommand } from "./summaryCommand";
import { SummaryOneFileCommand } from "./summaryOneFileCommand";

export class SummaryToolCommands {
  private summaryCommand: SummaryCommand;
  private contextMenuCommands: ContextMenuSummaryCommands;
  private summaryOneFileCommand: SummaryOneFileCommand;

  constructor() {
    this.summaryCommand = new SummaryCommand();
    this.contextMenuCommands = new ContextMenuSummaryCommands();
    this.summaryOneFileCommand = new SummaryOneFileCommand();
  }

  public registerCommands(context: vscode.ExtensionContext): void {
    // Main summarize command
    const summarizeCommand = vscode.commands.registerCommand(
      SummaryToolCommand.SUMMARIZE,
      () => this.summaryCommand.execute()
    );

    // Single file summarize command
    const summarizeOneFileCommand = vscode.commands.registerCommand(
      SummaryToolCommand.SUMMARIZE_ONE_FILE,
      () => this.summaryOneFileCommand.execute()
    );

    // Context menu commands
    const trackCommand = vscode.commands.registerCommand(
      SummaryToolCommand.ADD_TRACK,
      (uri: vscode.Uri) => this.contextMenuCommands.track(uri)
    );

    const untrackCommand = vscode.commands.registerCommand(
      SummaryToolCommand.ADD_UNTRACK,
      (uri: vscode.Uri) => this.contextMenuCommands.untrack(uri)
    );

    const ignoreStructureCommand = vscode.commands.registerCommand(
      SummaryToolCommand.IGNORE_STRUCTURE,
      (uri: vscode.Uri) => this.contextMenuCommands.toggleIgnoreStructure(uri)
    );

    const resetSettingsCommand = vscode.commands.registerCommand(
      SummaryToolCommand.RESET,
      () => this.contextMenuCommands.reset()
    );

    // Register all commands with the extension context
    context.subscriptions.push(
      summarizeCommand,
      summarizeOneFileCommand,
      trackCommand,
      untrackCommand,
      ignoreStructureCommand,
      resetSettingsCommand
    );
  }
}

// Export command registration helper
export function registerSummaryToolCommands(
  context: vscode.ExtensionContext
): SummaryToolCommands {
  const commands = new SummaryToolCommands();
  commands.registerCommands(context);
  return commands;
}

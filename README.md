# HTools Summary Tool

A VS Code extension that helps you summarize and extract project files for documentation or analysis purposes.

## Features

- **Project Structure Summary**: Generate a text-based tree view of your project structure
- **File Tracking**: Track specific files and folders for extraction
- **Smart Exclusion**: Exclude files/folders from tracking and structure analysis
- **Flexible Output**: Copy tracked files to a target folder with duplicate handling

## Usage

### Main Command

- Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
- Run `HTools: Summarize Project`
- Select target folder (if not configured)
- The tool will:
  - Generate `project_structure.txt` with your project tree
  - Copy all tracked files to the target folder

### Context Menu Options

Right-click on files/folders in the Explorer:

- **Track**: Add file/folder to tracking list
- **Untrack**: Exclude file/folder from tracking
- **Ignore Structure**: Exclude folder from structure summary

### Configuration

The extension uses workspace settings under `htool.summary-tool`:

- `target-folder`: Output directory path
- `track`: List of files/folders to track
- `untrack`: Patterns to exclude from tracking
- `ignore-structure`: Patterns to exclude from structure summary

## Installation

Install from VS Code Marketplace or run:

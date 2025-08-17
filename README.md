# Build AI Context

A VS Code extension that helps you summarize project structures and extract specific files for documentation, analysis, or sharing purposes.

https://github.com/user-attachments/assets/bd28c266-579f-4903-bf82-6bda818a1af5

## Features

### 📁 Project Structure Summary

- Generates a text-based tree view of your project structure
- Automatically excludes common build/dependency folders from structure display
- Customizable ignore patterns for cleaner output
- Saves structure as `project_structure.txt` in your target folder

### 📋 File Tracking & Extraction

- **Track files/folders**: Mark specific items for extraction
- **Smart exclusion**: Exclude files/folders using glob patterns and regex
- **Duplicate handling**: Automatically renames files if duplicates exist in target
- **Progress tracking**: Visual progress indicators during operations

### 🎯 Flexible Configuration

- Workspace-specific settings that persist across sessions
- Support for glob patterns (`*.js`, `**/*.ts`) and regex patterns (`/pattern/`)
- Context menu integration for easy file/folder management

## Usage

### Main Command

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run **"Build AI Context: Summarize Project"**
3. Select or configure target folder
4. The tool will:
   - Generate `project_structure.txt` with your project tree
   - Copy all tracked files to the target folder
   - Show summary of copied/skipped files

### Context Menu Commands

Right-click on files/folders in the Explorer:

- **"Track for Copy"**: Add item to tracking list for extraction
- **"Untrack for Copy"**: Remove item from tracking (add to exclusion list)
- **"Add/Remove from Ignore Folder in Summary"**: Toggle folder visibility in structure summary

### Additional Commands

- **"Reset All Settings"**: Reset all tracking, untrack, and ignore settings

## Configuration

The extension uses workspace settings under `build-ai-context.summary-tool.*`:

### Settings

- **`target-folder`**: Default output directory for summaries
- **`track`**: Array of files/folders to include in extraction
- **`untrack`**: Array of patterns to exclude from extraction
- **`ignore-structure`**: Array of patterns to exclude from structure display

### Default Exclusions

**Untrack patterns** (excluded from file copying):

```json
[
  "node_modules",
  ".venv",
  ".git",
  ".vscode",
  "dist",
  "build",
  "out",
  ".next",
  "coverage",
  "*.log",
  ".DS_Store",
  "Thumbs.db"
]
```

**Ignore structure patterns** (hidden in structure tree):

```json
[
  "node_modules",
  ".venv",
  ".git",
  "dist",
  "build",
  "out",
  ".next",
  "coverage",
  ".DS_Store",
  "Thumbs.db"
]
```

### Pattern Support

The extension supports multiple pattern types:

- **Glob patterns**: `*.js`, `**/*.ts`, `src/**`
- **Regex patterns**: `/^test.*\.js$/`, `/\.temp$/`
- **Literal paths**: `src/components`, `README.md`

## Example Workflow

1. **Initial Setup**: Run "Summarize Project" to set target folder
2. **Add Tracking**: Right-click important files → "Track for Copy"
3. **Exclude Items**: Right-click build folders → "Untrack for Copy"
4. **Clean Structure**: Right-click large folders → "Ignore Folder in Summary"
5. **Generate Summary**: Run "Summarize Project" again to export

## Output

The extension creates:

- **`project_structure.txt`**: Tree view of your project structure
- **Tracked files**: Copies of all files marked for tracking
- **Duplicate handling**: Automatic renaming (e.g., `file_1.js`, `file_2.js`)

## Requirements

- VS Code 1.102.0 or higher
- An open workspace/folder

## Installation

- Install from VS Code Marketplace

## Development

```bash
# Install dependencies
yarn install

# Compile TypeScript
yarn compile

# Watch for changes
yarn watch

# Run linting
yarn lint
```

## License

Apache License 2.0

## Contributing

Feel free to contribute by creating a pull request with your changes. Just fork the repository, make your changes, and submit a merge request.

---

**Note**: This extension stores settings in your workspace configuration, so your tracking preferences are preserved per project.

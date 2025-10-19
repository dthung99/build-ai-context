import * as fs from "fs";
import * as path from "path";
import {
  FolderNode,
  ProgressReporter,
  StructureSummaryOptions,
} from "../models/types";
import { PathUtils } from "../utils/pathUtils";
import { ExclusionMatcher } from "./exclusionMatcher";

export class StructureSummarizer {
  private exclusionMatcher: ExclusionMatcher;
  private progress: ProgressReporter | null = null;

  constructor(ignoreStructurePatterns: string[]) {
    this.exclusionMatcher = ExclusionMatcher.createForStructureIgnoring(
      ignoreStructurePatterns
    );
  }

  public setProgress(progress: ProgressReporter): void {
    this.progress = progress;
  }

  public async generateStructure(
    options: StructureSummaryOptions
  ): Promise<FolderNode> {
    const { workspacePath } = options;

    if (!PathUtils.exists(workspacePath)) {
      throw new Error(`Workspace path does not exist: ${workspacePath}`);
    }

    this.progress?.report({ message: "Analyzing project structure..." });

    const rootNode: FolderNode = {
      name: path.basename(workspacePath),
      path: workspacePath,
      isFile: false,
      children: {},
    };

    await this.buildStructureRecursive(workspacePath, rootNode, 0);

    this.progress?.report({ message: "Structure analysis complete!" });

    return rootNode;
  }

  private async buildStructureRecursive(
    currentPath: string,
    parentNode: FolderNode,
    depth: number
  ): Promise<void> {
    try {
      const items = await fs.promises.readdir(currentPath);

      for (const item of items) {
        const itemPath = path.join(currentPath, item);
        const relativePath = PathUtils.getRelativePathFromWorkspace(itemPath);

        // Check if this item should be excluded from structure
        const exclusionResult =
          this.exclusionMatcher.shouldExclude(relativePath);

        const stats = await PathUtils.getFileStats(itemPath);
        if (!stats) {
          continue; // Skip if can't get stats
        }

        if (stats.isDirectory()) {
          const childNode: FolderNode = {
            name: item,
            path: itemPath,
            isFile: false,
            children: {},
            isIgnored: exclusionResult.shouldExclude,
          };

          parentNode.children[item] = childNode;

          // If the directory is ignored, don't recurse into it
          if (!exclusionResult.shouldExclude) {
            await this.buildStructureRecursive(itemPath, childNode, depth + 1);
          }
        } else if (stats.isFile()) {
          // Files are always included in structure (null indicates a file)
          parentNode.children[item] = null;
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${currentPath}:`, error);
      // Continue processing other directories instead of failing completely
    }
  }

  public generateStructureText(structure: FolderNode): string {
    let output = "Project Structure:\n";
    output += "====================\n\n";

    output += this.printNodeRecursive(structure, 0, true);
    output +=
      "\n------------------------------------------------------------\n\n";

    return output;
  }

  private printNodeRecursive(
    node: FolderNode,
    depth: number,
    isRoot: boolean = false
  ): string {
    let output = "";
    const indent = "  ".repeat(depth);

    if (isRoot) {
      output += `${node.name}/\n`;
    }

    // Sort children: directories first, then files
    const sortedChildren = Object.entries(node.children).sort(
      ([aKey, aChild], [bKey, bChild]) => {
        // Directories (non-null) come first
        if (aChild !== null && bChild === null) {
          return -1;
        }
        if (aChild === null && bChild !== null) {
          return 1;
        }

        // Then sort alphabetically
        return aKey.localeCompare(bKey);
      }
    );

    for (let i = 0; i < sortedChildren.length; i++) {
      const [key, child] = sortedChildren[i];
      const isLast = i === sortedChildren.length - 1;
      const prefix = isLast ? "└── " : "├── ";

      if (child === null) {
        // It's a file
        output += `${indent}${prefix}${key}\n`;
      } else {
        // It's a directory
        const dirSymbol = child.isIgnored ? "📁 " : "";
        output += `${indent}${prefix}${dirSymbol}${key}/\n`;

        // Only recurse if not ignored
        if (!child.isIgnored) {
          const childIndent = isLast ? "    " : "│   ";
          const childOutput = this.printNodeRecursive(child, depth + 1);
          // Replace the first level of indentation with the proper tree structure
          const lines = childOutput.split("\n").filter((line) => line.trim());
          for (let j = 0; j < lines.length; j++) {
            const line = lines[j];
            output += `${indent}${childIndent}${line.substring(2)}\n`;
          }
        } else {
          // Show that the directory is hidden
          output += `${indent}${isLast ? "    " : "│   "}[... hidden ...]\n`;
        }
      }
    }

    return output;
  }

  public async saveStructureToFile(
    structure: FolderNode,
    filePath: string
  ): Promise<void> {
    // Check file extension to determine format
    const isJsonFormat = filePath.endsWith('.json');
    const content = isJsonFormat
      ? JSON.stringify(structure, null, 2)
      : this.generateStructureText(structure);

    // Ensure target directory exists
    const targetDir = PathUtils.getDirName(filePath);
    PathUtils.ensureDirectoryExists(targetDir);

    await fs.promises.writeFile(filePath, content, "utf8");
  }

  public countNodes(structure: FolderNode): {
    files: number;
    directories: number;
  } {
    let files = 0;
    let directories = 0;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [key, child] of Object.entries(structure.children)) {
      if (child === null) {
        files++;
      } else {
        directories++;
        if (!child.isIgnored) {
          const childCounts = this.countNodes(child);
          files += childCounts.files;
          directories += childCounts.directories;
        }
      }
    }

    return { files, directories };
  }

  public findNodeByPath(
    structure: FolderNode,
    targetPath: string
  ): FolderNode | null {
    if (structure.path === targetPath) {
      return structure;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [key, child] of Object.entries(structure.children)) {
      if (child !== null) {
        const found = this.findNodeByPath(child, targetPath);
        if (found) {
          return found;
        }
      }
    }

    return null;
  }

  public getIgnoredDirectories(structure: FolderNode): string[] {
    const ignored: string[] = [];

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [key, child] of Object.entries(structure.children)) {
      if (child !== null) {
        if (child.isIgnored) {
          ignored.push(child.path);
        } else {
          ignored.push(...this.getIgnoredDirectories(child));
        }
      }
    }

    return ignored;
  }

  public updateIgnorePatterns(newPatterns: string[]): void {
    this.exclusionMatcher =
      ExclusionMatcher.createForStructureIgnoring(newPatterns);
  }
}

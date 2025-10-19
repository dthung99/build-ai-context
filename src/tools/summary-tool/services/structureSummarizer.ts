import * as fs from "fs";
import * as path from "path";
import { STRUCTURE_CONTEXT } from "../constants";
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

  public async generateStructureText(structure: FolderNode): Promise<string> {
    const compactJson = await this.generateCompactJson(structure);

    // Wrap the structure with context information
    const wrappedStructure = {
      context: STRUCTURE_CONTEXT,
      folder_structure: compactJson,
    };

    return JSON.stringify(wrappedStructure, null, 2);
  }

  private async generateCompactJson(
    node: FolderNode
  ): Promise<Record<string, any>> {
    const result: Record<string, any> = {};

    // Sort children: directories first, then files, then alphabetically
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

    for (const [key, child] of sortedChildren) {
      if (child === null) {
        // It's a file
        result[key] = 0;
      } else {
        // It's a directory
        if (child.isIgnored) {
          // Show count of direct items in ignored directory
          const count = await PathUtils.countDirectItems(child.path);
          result[key] = count;
        } else {
          // Recurse into non-ignored directory
          result[key] = await this.generateCompactJson(child);
        }
      }
    }

    return result;
  }

  public async saveStructureToFile(
    structure: FolderNode,
    filePath: string
  ): Promise<void> {
    // Always generate compact JSON format now
    const content = await this.generateStructureText(structure);

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

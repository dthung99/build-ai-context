import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import {
  FileTrackingOptions,
  ProgressReporter,
  TrackingItem,
} from "../models/types";
import { PathUtils } from "../utils/pathUtils";
import { ExclusionMatcher } from "./exclusionMatcher";

export class FileTracker {
  private untrackMatcher: ExclusionMatcher;
  private progress: ProgressReporter | null = null;
  private copiedFiles: number = 0;
  private skippedFiles: number = 0;

  constructor(untrackPatterns: string[]) {
    this.untrackMatcher = ExclusionMatcher.createForUntracking(untrackPatterns);
  }

  public setProgress(progress: ProgressReporter): void {
    this.progress = progress;
  }

  public async trackAndCopyFiles(options: FileTrackingOptions): Promise<{
    copiedFiles: number;
    skippedFiles: number;
    totalFiles: number;
    trackedFiles: string[];
  }> {
    const { workspacePath, targetPath, trackPatterns } = options;

    // Reset counters
    this.copiedFiles = 0;
    this.skippedFiles = 0;

    // Ensure target directory exists
    PathUtils.ensureDirectoryExists(targetPath);

    this.progress?.report({ message: "Analyzing tracked files..." });

    // Get all tracked items
    const trackedItems = await this.getTrackedItems(
      workspacePath,
      trackPatterns
    );

    // Expand directories to get all files
    const allFiles = await this.expandTrackedItems(trackedItems);

    this.progress?.report({
      message: `Found ${allFiles.length} files to copy...`,
    });

    // Copy files
    const trackedFiles: string[] = [];
    for (let i = 0; i < allFiles.length; i++) {
      const file = allFiles[i];
      const success = await this.copyFile(file, targetPath);

      if (success) {
        trackedFiles.push(file.relativePath);
      }

      // Update progress
      const progressPercent = ((i + 1) / allFiles.length) * 100;
      this.progress?.report({
        message: `Copied: ${path.basename(file.path)}`,
        increment: progressPercent / allFiles.length,
      });
    }

    this.progress?.report({ message: "File copying complete!" });

    return {
      copiedFiles: this.copiedFiles,
      skippedFiles: this.skippedFiles,
      totalFiles: allFiles.length,
      trackedFiles,
    };
  }

  public async trackAndWriteToSingleFile(
    options: FileTrackingOptions
  ): Promise<{
    totalFiles: number;
    trackedFiles: string[];
    outputPath: string;
  }> {
    const { workspacePath, targetPath, trackPatterns } = options;

    // Reset counters
    this.copiedFiles = 0;
    this.skippedFiles = 0;

    // Ensure target directory exists
    PathUtils.ensureFileExists(targetPath);

    this.progress?.report({ message: "Analyzing tracked files..." });

    // Get all tracked items
    const trackedItems = await this.getTrackedItems(
      workspacePath,
      trackPatterns
    );

    // Expand directories to get all files
    const allFiles = await this.expandTrackedItems(trackedItems);

    this.progress?.report({
      message: `Found ${allFiles.length} files to copy...`,
    });

    // Write to combined content
    for (let i = 0; i < allFiles.length; i++) {
      const file = allFiles[i];

      try {
        await this.appendFileToOutput(file, targetPath);

        // Update progress
        const progressPercent = ((i + 1) / allFiles.length) * 100;
        this.progress?.report({
          message: `Processing: ${path.basename(file.path)}`,
          increment: progressPercent / allFiles.length,
        });
      } catch (error) {
        console.error(`Error processing file ${file.path}:`, error);

        // Append error message instead of file content
        const errorHeader =
          "-".repeat(60) +
          "\n" +
          `File: ${file.relativePath}\n` +
          "-".repeat(60) +
          "\n" +
          `Error reading file: ${error}\n`;

        if (i < allFiles.length - 1) {
          await fs.promises.appendFile(
            targetPath,
            errorHeader + "\n\n",
            "utf8"
          );
        } else {
          await fs.promises.appendFile(targetPath, errorHeader, "utf8");
        }
      }
    }

    this.progress?.report({ message: "Combined file creation complete!" });

    return {
      totalFiles: allFiles.length,
      trackedFiles: allFiles.map((file) => file.relativePath),
      outputPath: targetPath,
    };
  }

  private async getTrackedItems(
    workspacePath: string,
    trackPatterns: string[]
  ): Promise<TrackingItem[]> {
    const trackedItems: TrackingItem[] = [];

    for (const pattern of trackPatterns) {
      const absolutePath = PathUtils.isAbsolute(pattern)
        ? pattern
        : PathUtils.resolvePath(workspacePath, pattern);

      if (PathUtils.exists(absolutePath)) {
        const stats = await PathUtils.getFileStats(absolutePath);
        if (stats) {
          const relativePath =
            PathUtils.getRelativePathFromWorkspace(absolutePath);

          trackedItems.push({
            path: absolutePath,
            relativePath,
            isFile: stats.isFile(),
            isTracked: true,
          });
        }
      } else {
        console.warn(`Tracked item not found: ${pattern}`);
      }
    }

    return trackedItems;
  }

  private async expandTrackedItems(
    trackedItems: TrackingItem[]
  ): Promise<TrackingItem[]> {
    const allFiles: TrackingItem[] = [];

    for (const item of trackedItems) {
      if (item.isFile) {
        // Check if file should be untracked
        const exclusionResult = this.untrackMatcher.shouldExclude(
          item.relativePath
        );
        if (!exclusionResult.shouldExclude) {
          allFiles.push(item);
        }
      } else {
        // It's a directory, expand it
        const files = await this.expandDirectory(item.path);
        allFiles.push(...files);
      }
    }

    return allFiles;
  }

  private async expandDirectory(
    directoryPath: string
  ): Promise<TrackingItem[]> {
    const files: TrackingItem[] = [];

    try {
      const items = await fs.promises.readdir(directoryPath);

      for (const item of items) {
        const itemPath = path.join(directoryPath, item);
        const relativePath = PathUtils.getRelativePathFromWorkspace(itemPath);

        // Check if this item should be untracked
        const exclusionResult = this.untrackMatcher.shouldExclude(relativePath);
        if (exclusionResult.shouldExclude) {
          continue; // Skip this item
        }

        const stats = await PathUtils.getFileStats(itemPath);
        if (!stats) {
          continue;
        }

        if (stats.isFile()) {
          files.push({
            path: itemPath,
            relativePath,
            isFile: true,
            isTracked: true,
          });
        } else if (stats.isDirectory()) {
          // Recursively expand subdirectories
          const subFiles = await this.expandDirectory(itemPath);
          files.push(...subFiles);
        }
      }
    } catch (error) {
      console.error(`Error expanding directory ${directoryPath}:`, error);
    }

    return files;
  }

  private async copyFile(
    file: TrackingItem,
    targetPath: string
  ): Promise<boolean> {
    try {
      const fileName = path.basename(file.path);
      let targetFilePath = path.join(targetPath, fileName);

      // Check if file already exists
      if (PathUtils.exists(targetFilePath)) {
        const stats = await PathUtils.getFileStats(targetFilePath);

        // Make sure it's actually a file (not a directory)
        if (stats && stats.isFile()) {
          // Check if content is the same
          const isSameContent = await this.compareFileContents(
            file.path,
            targetFilePath
          );

          if (isSameContent) {
            // Files are identical, no need to copy
            // eslint-disable-next-line no-console
            console.log(
              `File ${fileName} already exists with same content, skipping copy`
            );
            this.skippedFiles++;
            return true; // Consider this a success since file already exists correctly
          }

          // Content is different, get unique filename
          const uniqueFileName = PathUtils.getUniqueFileName(
            targetPath,
            fileName
          );
          targetFilePath = path.join(targetPath, uniqueFileName);
        }
      }

      await fs.promises.copyFile(file.path, targetFilePath);
      this.copiedFiles++;
      return true;
    } catch (error) {
      console.error(`Error copying file ${file.path}:`, error);
      this.skippedFiles++;
      return false;
    }
  }

  private async appendFileToOutput(
    file: TrackingItem,
    outputFilePath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Create header for this file
      const header =
        "-".repeat(60) +
        "\n" +
        `File: ${file.relativePath}\n` +
        "-".repeat(60) +
        "\n";

      // Create streams
      const readStream = fs.createReadStream(file.path, { encoding: "utf8" });
      const writeStream = fs.createWriteStream(outputFilePath, {
        flags: "a", // append mode
        encoding: "utf8",
      });

      // Write header first
      writeStream.write(header);

      // Handle stream events
      readStream.on("error", (error) => {
        writeStream.destroy();
        reject(new Error(`Error reading ${file.path}: ${error.message}`));
      });

      writeStream.on("error", (error) => {
        readStream.destroy();
        reject(new Error(`Error writing to output: ${error.message}`));
      });

      readStream.on("end", () => {
        // Add spacing after file content (except for last file)
        // Note: We can't easily know if this is the last file here,
        // so we'll add spacing and trim at the end if needed
        writeStream.write("\n\n");
        writeStream.end();
      });

      writeStream.on("finish", () => {
        resolve();
      });

      // Pipe the file content
      readStream.pipe(writeStream, { end: false });
    });
  }

  public async calculateTotalSize(
    workspacePath: string,
    trackPatterns: string[]
  ): Promise<{
    totalSize: number;
    formattedSize: string;
    fileCount: number;
  }> {
    const trackedItems = await this.getTrackedItems(
      workspacePath,
      trackPatterns
    );
    const allFiles = await this.expandTrackedItems(trackedItems);

    let totalSize = 0;
    let fileCount = 0;

    for (const file of allFiles) {
      const size = await PathUtils.getFileSize(file.path);
      totalSize += size;
      fileCount++;
    }

    return {
      totalSize,
      formattedSize: PathUtils.formatFileSize(totalSize),
      fileCount,
    };
  }

  private async compareFileContents(
    filePath1: string,
    filePath2: string
  ): Promise<boolean> {
    try {
      // Step 1: Quick size check (almost free)
      const stats1 = await PathUtils.getFileStats(filePath1);
      const stats2 = await PathUtils.getFileStats(filePath2);

      if (!stats1 || !stats2 || stats1.size !== stats2.size) {
        return false; // Different sizes = different files
      }

      // Step 2: Empty files are identical
      if (stats1.size === 0) {
        return true;
      }

      // Step 3: Use hash comparison
      const hash1 = await this.getFileHash(filePath1);
      const hash2 = await this.getFileHash(filePath2);

      return hash1 === hash2;
    } catch (error) {
      console.error(
        `Error comparing files ${filePath1} and ${filePath2}:`,
        error
      );
      return false;
    }
  }

  private async getFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash("sha256");
      const stream = fs.createReadStream(filePath);

      stream.on("data", (chunk) => {
        hash.update(chunk);
      });

      stream.on("end", () => {
        resolve(hash.digest("hex"));
      });

      stream.on("error", (error) => {
        reject(error);
      });
    });
  }
}

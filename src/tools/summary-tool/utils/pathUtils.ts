import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

export class PathUtils {
  /**
   * Get relative path from workspace root
   */
  public static getRelativePathFromWorkspace(absolutePath: string): string {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return absolutePath;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    return path.relative(workspaceRoot, absolutePath);
  }

  /**
   * Get absolute path from workspace relative path
   */
  public static getAbsolutePathFromWorkspace(relativePath: string): string {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return relativePath;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    return path.resolve(workspaceRoot, relativePath);
  }

  /**
   * Ensure directory exists, create if it doesn't
   */
  public static ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Get unique filename if file already exists in target directory
   */
  public static getUniqueFileName(targetDir: string, fileName: string): string {
    let uniqueName = fileName;
    let counter = 1;

    const ext = path.extname(fileName);
    const baseName = path.basename(fileName, ext);

    while (fs.existsSync(path.join(targetDir, uniqueName))) {
      uniqueName = `${baseName}_${counter}${ext}`;
      counter++;
    }

    return uniqueName;
  }

  /**
   * Sanitize filename for cross-platform compatibility
   */
  public static sanitizeFileName(fileName: string): string {
    return fileName.replace(/[<>:"/\\|?*]/g, "_");
  }

  /**
   * Check if a path is a subdirectory of another path
   */
  public static isSubdirectory(parent: string, child: string): boolean {
    const relative = path.relative(parent, child);
    return !relative.startsWith("..") && !path.isAbsolute(relative);
  }

  /**
   * Get file stats safely
   */
  public static async getFileStats(filePath: string): Promise<fs.Stats | null> {
    try {
      return await fs.promises.stat(filePath);
    } catch {
      return null;
    }
  }

  /**
   * Check if file/directory exists
   */
  public static exists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  /**
   * Get file extension (including dot)
   */
  public static getExtension(filePath: string): string {
    return path.extname(filePath);
  }

  /**
   * Get filename without extension
   */
  public static getBaseName(filePath: string): string {
    return path.basename(filePath, path.extname(filePath));
  }

  /**
   * Normalize path separators for current platform
   */
  public static normalizePath(filePath: string): string {
    return path.normalize(filePath);
  }

  /**
   * Join paths safely
   */
  public static joinPaths(...paths: string[]): string {
    return path.join(...paths);
  }

  /**
   * Get directory name from path
   */
  public static getDirName(filePath: string): string {
    return path.dirname(filePath);
  }

  /**
   * Check if path is absolute
   */
  public static isAbsolute(filePath: string): boolean {
    return path.isAbsolute(filePath);
  }

  /**
   * Convert path to URI
   */
  public static pathToUri(filePath: string): vscode.Uri {
    return vscode.Uri.file(filePath);
  }

  /**
   * Convert URI to path
   */
  public static uriToPath(uri: vscode.Uri): string {
    return uri.fsPath;
  }

  /**
   * Get workspace root path
   */
  public static getWorkspaceRoot(): string | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    return workspaceFolders?.[0]?.uri.fsPath;
  }

  /**
   * Check if path is within workspace
   */
  public static isInWorkspace(filePath: string): boolean {
    const workspaceRoot = this.getWorkspaceRoot();
    if (!workspaceRoot) {
      return false;
    }
    return this.isSubdirectory(workspaceRoot, filePath);
  }

  /**
   * Get relative path between two paths
   */
  public static getRelativePath(from: string, to: string): string {
    return path.relative(from, to);
  }

  /**
   * Resolve path relative to another path
   */
  public static resolvePath(basePath: string, relativePath: string): string {
    return path.resolve(basePath, relativePath);
  }

  /**
   * Get file size in bytes
   */
  public static async getFileSize(filePath: string): Promise<number> {
    const stats = await this.getFileStats(filePath);
    return stats?.size || 0;
  }

  /**
   * Format file size for display
   */
  public static formatFileSize(bytes: number): string {
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Check if directory is empty
   */
  public static isDirectoryEmpty(dirPath: string): boolean {
    try {
      const files = fs.readdirSync(dirPath);
      return files.length === 0;
    } catch (error) {
      console.error(`Error checking if directory is empty: ${error}`);
      return false;
    }
  }

  /**
   * Delete all files in a directory
   */
  public static deleteFilesInDirectory(dirPath: string): void {
    try {
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        if (fs.lstatSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
        } else {
          this.deleteFilesInDirectory(filePath); // Recursively delete subdirectories
          fs.rmdirSync(filePath); // Remove empty directory
        }
      }
    } catch (error) {
      console.error(`Error deleting files in directory: ${error}`);
    }
  }
}

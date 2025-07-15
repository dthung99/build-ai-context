import globToRegExp from "glob-to-regexp";
import { ExclusionMatchResult } from "../models/types";

export class ExclusionMatcher {
  private patterns: RegExp[];
  private originalPatterns: string[];

  constructor(patterns: string[]) {
    this.originalPatterns = patterns;
    this.patterns = patterns.map((pattern) =>
      this.createRegexFromPattern(pattern)
    );
  }

  private createRegexFromPattern(pattern: string): RegExp {
    // If it's explicitly a regex pattern (starts and ends with /)
    if (pattern.startsWith("/") && pattern.endsWith("/")) {
      // Remove the slashes and create RegExp directly
      try {
        return new RegExp(pattern.slice(1, -1), "i"); // 'i' for case-insensitive
      } catch {
        console.warn(
          `Invalid regex pattern: ${pattern}, treating as literal string.`
        );
        // Fallback to escaping if it's an invalid regex
        return new RegExp(this.escapeRegex(pattern), "i");
      }
    } else {
      // Normalize path separators for cross-platform compatibility
      const normalizedPattern = pattern.replace(/\\/g, "/");

      // Use glob-to-regexp for glob-like patterns
      // The `globstar: true` option handles `**` for recursive matching.
      // The `extended: true` option enables additional glob features
      return globToRegExp(normalizedPattern, {
        globstar: true,
        extended: true,
        flags: "i",
      });
    }
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  public shouldExclude(itemPath: string): ExclusionMatchResult {
    // Normalize path separators for consistent matching
    const normalizedPath = itemPath.replace(/\\/g, "/");

    for (let i = 0; i < this.patterns.length; i++) {
      const pattern = this.patterns[i];
      const originalPattern = this.originalPatterns[i];

      // Test against the full path
      if (pattern.test(normalizedPath)) {
        return {
          shouldExclude: true,
          matchedPattern: originalPattern,
        };
      }

      // Also test against just the filename/foldername
      const itemName = normalizedPath.split("/").pop() || "";
      if (pattern.test(itemName)) {
        return {
          shouldExclude: true,
          matchedPattern: originalPattern,
        };
      }

      // For directory patterns, check if the path starts with the pattern
      const normalizedPattern = this.originalPatterns[i].replace(/\\/g, "/");

      // Handle glob patterns like **/*.ts by testing the full path
      if (originalPattern.includes("*")) {
        // Already handled by the regex test above
        continue;
      }

      // Handle exact path matching for directories
      if (
        normalizedPath.startsWith(normalizedPattern + "/") ||
        normalizedPath === normalizedPattern
      ) {
        return {
          shouldExclude: true,
          matchedPattern: originalPattern,
        };
      }
    }

    return {
      shouldExclude: false,
    };
  }

  public testPath(itemPath: string): { matches: string[]; excluded: boolean } {
    const matches: string[] = [];
    const normalizedPath = itemPath.replace(/\\/g, "/");

    for (let i = 0; i < this.patterns.length; i++) {
      const pattern = this.patterns[i];
      const originalPattern = this.originalPatterns[i];

      // Test against the full path
      if (pattern.test(normalizedPath)) {
        matches.push(originalPattern);
        continue;
      }

      // Also test against just the filename/foldername
      const itemName = normalizedPath.split("/").pop() || "";
      if (pattern.test(itemName)) {
        matches.push(originalPattern);
        continue;
      }

      // For non-glob patterns, check substring matching
      if (!originalPattern.includes("*")) {
        const normalizedPattern = this.originalPatterns[i].replace(/\\/g, "/");
        if (
          normalizedPath.startsWith(normalizedPattern + "/") ||
          normalizedPath === normalizedPattern
        ) {
          matches.push(originalPattern);
        }
      }
    }

    return {
      matches,
      excluded: matches.length > 0,
    };
  }

  public static createForUntracking(patterns: string[]): ExclusionMatcher {
    return new ExclusionMatcher(patterns);
  }

  public static createForStructureIgnoring(
    patterns: string[]
  ): ExclusionMatcher {
    return new ExclusionMatcher(patterns);
  }
}

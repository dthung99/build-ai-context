/**
 * Constants used across the summary tool
 */

/** Output file names */
export const OUTPUT_FILES = {
  PROJECT_STRUCTURE: "project_structure.txt",
} as const;

/** UI Messages */
export const MESSAGES = {
  NO_WORKSPACE: "No workspace folder is open",
  FOLDER_NOT_EMPTY: "Target folder is not empty. Do you want to proceed?",
} as const;

/** UI Labels */
export const LABELS = {
  DELETE_AND_PROCEED: "Delete Files And Proceed",
  PROCEED: "Proceed",
  OPEN_FOLDER: "Open Output Folder",
  OPEN_STRUCTURE: "Open Structure File",
  OPEN_COMBINED_FILE: "Open Combined File",
  USE_EXISTING_FOLDER: "Use existing target folder",
  CHOOSE_NEW_FOLDER: "Choose new target folder",
} as const;

/** Progress messages */
export const PROGRESS = {
  GENERATING_STRUCTURE: "Generating project structure...",
  STRUCTURE_COMPLETE: "Structure analysis complete",
  PROCESSING_FILES: "Processing tracked files...",
  COPYING_COMPLETE: "File copying complete",
  SAVING_STRUCTURE: "Saving structure summary...",
  ALL_FINISHED: "All steps finished!",
  GENERATION_COMPLETE: "Single file generation complete!",
} as const;

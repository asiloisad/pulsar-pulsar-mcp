/**
 * Tool definitions for Pulsar MCP server
 * Each tool contains: name, description, inputSchema, execute
 */

const fs = require("fs");
const pathModule = require("path");

// ============================================================================
// Tool Definitions
// ============================================================================

function getProjectRootPaths() {
  return atom.project.getDirectories().map((directory) => directory.getPath());
}

function findExistingPath(filePath) {
  if (pathModule.isAbsolute(filePath)) {
    return fs.existsSync(filePath) ? filePath : null;
  }

  for (const projectPath of getProjectRootPaths()) {
    const candidate = pathModule.join(projectPath, filePath);
    if (fs.existsSync(candidate)) return candidate;
  }

  return fs.existsSync(filePath) ? filePath : null;
}

function resolvePathForCreate(filePath) {
  if (pathModule.isAbsolute(filePath)) return filePath;
  const [projectPath] = getProjectRootPaths();
  return projectPath ? pathModule.join(projectPath, filePath) : filePath;
}

const tools = {
  GetActiveEditor: {
    name: "GetActiveEditor",
    description:
      "Get active editor metadata. Returns {path, grammar, modified, lineCount}. Use ReadText for content, GetSelections for cursors/selections.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
    annotations: { readOnlyHint: true },
    execute() {
      const editor = atom.workspace.getActiveTextEditor();
      if (!editor) return null;
      return {
        path: editor.getPath() || null,
        grammar: editor.getGrammar()?.name || "Plain Text",
        modified: editor.isModified(),
        lineCount: editor.getLineCount(),
      };
    },
  },

  GetOpenEditors: {
    name: "GetOpenEditors",
    description:
      "Get metadata for all open text editors. Returns array of {path, grammar, modified, lineCount, active}.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
    annotations: { readOnlyHint: true },
    execute() {
      const activeEditor = atom.workspace.getActiveTextEditor();
      return atom.workspace.getTextEditors().map((editor) => ({
        path: editor.getPath() || null,
        grammar: editor.getGrammar()?.name || "Plain Text",
        modified: editor.isModified(),
        lineCount: editor.getLineCount(),
        active: editor === activeEditor,
      }));
    },
  },

  ReadText: {
    name: "ReadText",
    description:
      "Read buffer content from active editor. For files >500 lines, use offset/limit pagination to avoid truncation. Modes: (1) offset/limit - returns {content, totalLines, hasMore, range}. (2) start/end positions. (3) No params = full content (small files only).",
    inputSchema: {
      type: "object",
      properties: {
        offset: {
          type: "number",
          description: "Start line for pagination (0-indexed). Use with limit for chunked reading.",
        },
        limit: {
          type: "number",
          description:
            "Max lines to read (recommended: <500). Returns hasMore=true if more lines exist.",
        },
        start: {
          type: "object",
          description: "Start position (0-indexed). If omitted, reads from beginning.",
          properties: {
            row: { type: "number", description: "Row (0-indexed)" },
            column: { type: "number", description: "Column (0-indexed)" },
          },
          required: ["row", "column"],
        },
        end: {
          type: "object",
          description: "End position (0-indexed). If omitted, reads to end of file.",
          properties: {
            row: { type: "number", description: "Row (0-indexed)" },
            column: { type: "number", description: "Column (0-indexed)" },
          },
          required: ["row", "column"],
        },
      },
      required: [],
    },
    annotations: { readOnlyHint: true },
    execute({ offset, limit, start, end } = {}) {
      const editor = atom.workspace.getActiveTextEditor();
      if (!editor) return null;

      const path = editor.getPath() || null;
      const totalLines = editor.getLineCount();

      // Line-based pagination (offset/limit)
      if (offset !== undefined || limit !== undefined) {
        const startLine = offset || 0;
        const endLine = limit !== undefined ? Math.min(startLine + limit, totalLines) : totalLines;
        const lastCol = editor.lineTextForBufferRow(endLine - 1)?.length || 0;
        const range = [
          [startLine, 0],
          [endLine - 1, lastCol],
        ];
        return {
          content: editor.getTextInBufferRange(range),
          path,
          totalLines,
          hasMore: endLine < totalLines,
          range: { start: startLine, end: endLine - 1 },
        };
      }

      // Position-based range (existing behavior)
      if (start || end) {
        const lastRow = editor.getLastBufferRow();
        const s = start || { row: 0, column: 0 };
        const e = end || { row: lastRow, column: editor.lineTextForBufferRow(lastRow).length };
        const range = [
          [s.row, s.column],
          [e.row, e.column],
        ];
        return {
          content: editor.getTextInBufferRange(range),
          path,
          totalLines,
          range: { start: s, end: e },
        };
      }

      // Return full content
      return {
        content: editor.getText(),
        path,
        totalLines,
      };
    },
  },

  WriteText: {
    name: "WriteText",
    description:
      "Write text into active editor. With start: inserts at position (end defaults to start). With start+end: replaces range. Without: inserts at cursors. Returns {written, oldText?, path}.",
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "The text to write",
        },
        start: {
          type: "object",
          description: "Start position (0-indexed). If omitted, inserts at cursor.",
          properties: {
            row: { type: "number", description: "Row (0-indexed)" },
            column: { type: "number", description: "Column (0-indexed)" },
          },
          required: ["row", "column"],
        },
        end: {
          type: "object",
          description: "End position (0-indexed). Defaults to start (insert without replacing).",
          properties: {
            row: { type: "number", description: "Row (0-indexed)" },
            column: { type: "number", description: "Column (0-indexed)" },
          },
          required: ["row", "column"],
        },
      },
      required: ["text"],
    },
    annotations: { readOnlyHint: false },
    execute({ text, start, end }) {
      if (typeof text !== "string") throw new Error("text is required");

      const editor = atom.workspace.getActiveTextEditor();
      if (!editor) return { written: false };

      // If start specified, insert/replace at position
      if (start) {
        const e = end || start; // Default end to start (insert without replacing)
        const range = [
          [start.row, start.column],
          [e.row, e.column],
        ];
        const oldText = editor.getTextInBufferRange(range);
        editor.setTextInBufferRange(range, text);
        return { written: true, oldText, path: editor.getPath() || null };
      }

      // Otherwise insert at cursor/replace selection
      editor.insertText(text);
      return { written: true, path: editor.getPath() || null };
    },
  },

  OpenFile: {
    name: "OpenFile",
    description:
      "Open an existing file in editor. All positions are 0-indexed. Set create=true to create a new file if path doesn't exist.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File path (absolute or relative to project root)",
        },
        row: {
          type: "number",
          description: "Row to navigate to (0-indexed, optional)",
        },
        column: {
          type: "number",
          description: "Column to navigate to (0-indexed, optional)",
        },
        create: {
          type: "boolean",
          description: "Create the file if it does not exist (default: false)",
        },
      },
      required: ["path"],
    },
    annotations: { readOnlyHint: false },
    async execute({ path, row, column, create = false }) {
      if (typeof path !== "string") throw new Error("path is required");
      const existingPath = findExistingPath(path);
      if (!existingPath && !create) {
        return { opened: false, error: "file_not_found", path };
      }

      const targetPath = existingPath || resolvePathForCreate(path);
      const options = {};
      if (row !== undefined) {
        options.initialLine = row;
        if (column !== undefined) {
          options.initialColumn = column;
        }
      }
      await atom.workspace.open(targetPath, options);
      return { opened: true, path: targetPath, created: !existingPath };
    },
  },

  SaveFile: {
    name: "SaveFile",
    description:
      "Save a file. Returns true on success, false if file not found or no editor. If path omitted, saves active editor.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File path to save (optional, defaults to active editor)",
        },
      },
      required: [],
    },
    annotations: { readOnlyHint: false },
    async execute({ path }) {
      if (path) {
        const editor = atom.workspace.getTextEditors().find((e) => e.getPath() === path);
        if (!editor) return { saved: false };
        await editor.save();
        return { saved: true };
      }

      const editor = atom.workspace.getActiveTextEditor();
      if (!editor) return { saved: false };

      await editor.save();
      return { saved: true };
    },
  },

  CloseFile: {
    name: "CloseFile",
    description:
      "Close an editor tab. Returns true on success, false if file not found. If path omitted, closes active editor. Unsaved changes are discarded unless save=true.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File path to close (optional, defaults to active editor)",
        },
        save: {
          type: "boolean",
          description: "Save before closing if modified (default: false)",
        },
      },
      required: [],
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
    async execute({ path, save = false }) {
      let editor, pane;

      if (path) {
        editor = atom.workspace.getTextEditors().find((e) => e.getPath() === path);
        if (!editor) return { closed: false };
        pane = atom.workspace.paneForItem(editor);
      } else {
        editor = atom.workspace.getActiveTextEditor();
        if (!editor) return { closed: false };
        pane = atom.workspace.getActivePane();
      }

      if (save && editor.isModified()) {
        await editor.save();
      }

      pane.destroyItem(editor, true);
      return { closed: true };
    },
  },

  GetSelections: {
    name: "GetSelections",
    description:
      "Get all selections/cursors. Returns array of {text: string, isEmpty: boolean, range: {start: {row, column}, end: {row, column}}} (0-indexed). First element is primary selection. Returns null if no editor.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
    annotations: { readOnlyHint: true },
    execute() {
      const editor = atom.workspace.getActiveTextEditor();
      if (!editor) return null;

      return editor.getSelections().map((selection) => {
        const range = selection.getBufferRange();
        return {
          text: selection.getText(),
          isEmpty: selection.isEmpty(),
          range: {
            start: { row: range.start.row, column: range.start.column },
            end: { row: range.end.row, column: range.end.column },
          },
        };
      });
    },
  },

  SetSelections: {
    name: "SetSelections",
    description:
      "Set selections/cursors in active editor. All positions are 0-indexed. If end equals start (or omitted), places cursor without selection. First selection becomes primary. Returns {set: true, count: number} on success, {set: false} if no editor.",
    inputSchema: {
      type: "object",
      properties: {
        selections: {
          type: "array",
          description: "Array of selection ranges to set",
          items: {
            type: "object",
            properties: {
              start: {
                type: "object",
                description: "Start position (0-indexed)",
                properties: {
                  row: { type: "number", description: "Row (0-indexed)" },
                  column: { type: "number", description: "Column (0-indexed)" },
                },
                required: ["row", "column"],
              },
              end: {
                type: "object",
                description:
                  "End position (0-indexed). Omit or set equal to start for cursor-only.",
                properties: {
                  row: { type: "number", description: "Row (0-indexed)" },
                  column: { type: "number", description: "Column (0-indexed)" },
                },
                required: ["row", "column"],
              },
            },
            required: ["start"],
          },
          minItems: 1,
        },
      },
      required: ["selections"],
    },
    annotations: { readOnlyHint: false },
    execute({ selections }) {
      if (!Array.isArray(selections) || selections.length === 0) {
        throw new Error("selections array is required and must not be empty");
      }

      const editor = atom.workspace.getActiveTextEditor();
      if (!editor) return { set: false };

      // Clear existing selections and set new ones
      const ranges = selections.map((sel) => {
        const start = sel.start;
        const end = sel.end || sel.start;
        return [
          [start.row, start.column],
          [end.row, end.column],
        ];
      });

      editor.setSelectedBufferRanges(ranges);
      return { set: true, count: selections.length };
    },
  },

  GetProjectPaths: {
    name: "GetProjectPaths",
    description:
      "Get project root folders. Returns string[] of absolute paths. Empty array if no project open.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
    annotations: { readOnlyHint: true },
    execute() {
      return atom.project.getPaths();
    },
  },

  AddProjectPath: {
    name: "AddProjectPath",
    description:
      "Add a folder to project roots without removing existing paths. Returns true on success, false if path invalid.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Absolute folder path to add",
        },
      },
      required: ["path"],
    },
    annotations: { readOnlyHint: false },
    execute({ path }) {
      if (typeof path !== "string") throw new Error("path is required");
      atom.project.addPath(path);
      return { added: true };
    },
  },

  RemoveProjectPath: {
    name: "RemoveProjectPath",
    description:
      "Remove a folder from project roots. Returns true on success, false if path not in project.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Absolute folder path to remove",
        },
      },
      required: ["path"],
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
    execute({ path }) {
      if (typeof path !== "string") throw new Error("path is required");
      if (!atom.project.getPaths().includes(path)) {
        return { removed: false };
      }
      atom.project.removePath(path);
      return { removed: true };
    },
  },
};

// ============================================================================
// Exports
// ============================================================================

/**
 * Get tool metadata for MCP protocol (name, description, inputSchema)
 */
function getToolsList() {
  return Object.values(tools).map(({ name, description, inputSchema, annotations }) => ({
    name,
    description,
    inputSchema,
    annotations,
  }));
}

/**
 * Execute a builtin tool by name
 */
async function executeTool(toolName, args = {}) {
  const tool = tools[toolName];
  if (!tool) {
    return { success: false, error: `Unknown tool: ${toolName}` };
  }

  try {
    const data = await tool.execute(args);
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

/**
 * Get tool definition by name
 */
function getToolByName(name) {
  return tools[name] || null;
}

module.exports = { tools, getToolsList, executeTool, getToolByName };

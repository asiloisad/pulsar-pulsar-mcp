/**
 * Tool definitions for Pulsar MCP server
 * Each tool contains: name, description, inputSchema, execute
 */

// ============================================================================
// Tool Definitions
// ============================================================================

const tools = {
  GetActiveEditor: {
    name: "GetActiveEditor",
    description:
      "Get the active editor state. Returns {path: string|null, content: string, cursorPosition: {row, column} (0-indexed), grammar: string, modified: boolean}, or null if no editor is open.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
    annotations: { readOnlyHint: true },
    execute() {
      const editor = atom.workspace.getActiveTextEditor();
      if (!editor) return null;

      const cursor = editor.getCursorBufferPosition();
      return {
        path: editor.getPath() || null,
        content: editor.getText(),
        cursorPosition: { row: cursor.row, column: cursor.column },
        grammar: editor.getGrammar()?.name || "Plain Text",
        modified: editor.isModified(),
      };
    },
  },

  InsertText: {
    name: "InsertText",
    description:
      "Insert text at cursor or replace selection. If text is selected, replaces it; otherwise inserts at cursor. Works with multi-cursor. Returns true on success, false if no editor.",
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "The text to insert (replaces selection if any)",
        },
      },
      required: ["text"],
    },
    annotations: { readOnlyHint: false },
    execute({ text }) {
      if (typeof text !== "string") throw new Error("text is required");
      const editor = atom.workspace.getActiveTextEditor();
      if (!editor) return { inserted: false };
      editor.insertText(text);
      return { inserted: true };
    },
  },

  OpenFile: {
    name: "OpenFile",
    description:
      "Open a file in editor. All positions are 0-indexed. Returns true on success. Creates new file if path doesn't exist.",
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
      },
      required: ["path"],
    },
    annotations: { readOnlyHint: false },
    async execute({ path, row, column }) {
      if (typeof path !== "string") throw new Error("path is required");
      const options = {};
      if (row !== undefined) {
        options.initialLine = row;
        if (column !== undefined) {
          options.initialColumn = column;
        }
      }
      await atom.workspace.open(path, options);
      return { opened: true };
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

  SaveFile: {
    name: "SaveFile",
    description:
      "Save a file. Returns true on success, false if file not found or no editor. If path omitted, saves active editor.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "File path to save (optional, defaults to active editor)",
        },
      },
      required: [],
    },
    annotations: { readOnlyHint: false },
    async execute({ path }) {
      if (path) {
        const editor = atom.workspace
          .getTextEditors()
          .find((e) => e.getPath() === path);
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

  CloseFile: {
    name: "CloseFile",
    description:
      "Close an editor tab. Returns true on success, false if file not found. If path omitted, closes active editor. Unsaved changes are discarded unless save=true.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "File path to close (optional, defaults to active editor)",
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
        editor = atom.workspace
          .getTextEditors()
          .find((e) => e.getPath() === path);
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
};

// ============================================================================
// Exports
// ============================================================================

/**
 * Get tool metadata for MCP protocol (name, description, inputSchema)
 */
function getToolsList() {
  return Object.values(tools).map(
    ({ name, description, inputSchema, annotations }) => ({
      name,
      description,
      inputSchema,
      annotations,
    })
  );
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

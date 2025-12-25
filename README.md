# pulsar-mcp

MCP (Model Context Protocol) server for Pulsar editor - provides editor tools to Claude and other AI assistants.

## Features

- MCP protocol version 2025-11-25 with tool annotations support
- HTTP bridge server running inside Pulsar for direct editor API access
- Standalone MCP server script for Claude CLI integration
- Built-in editor tools (get/set editor content, open/save files, manage selections)
- Extensible: other packages can register additional tools via the `mcp-tools` service

## Installation

To install `pulsar-mcp` search for [pulsar-mcp](https://web.pulsar-edit.dev/packages/pulsar-mcp) in the Install pane of the Pulsar settings or run `ppm install pulsar-mcp`. Alternatively, you can run `ppm install asiloisad/pulsar-mcp` to install a package directly from the GitHub repository.

## Commands

| Command | Description |
|---------|-------------|
| `Pulsar MCP: Start` | Start the MCP bridge server |
| `Pulsar MCP: Stop` | Stop the MCP bridge server |
| `Pulsar MCP: Status` | Show current bridge status and port |

## Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| Auto Start | Automatically start bridge when Pulsar opens | `true` |
| Bridge Base Port | Base port for MCP bridge (auto-increments for multiple windows) | `3000` |
| Debug Mode | Enable debug logging to console | `false` |

## Built-in Tools

| Tool | Description |
|------|-------------|
| `GetActiveEditor` | Get editor metadata (path, cursor, grammar, modified, lineCount, charCount) |
| `ReadText` | Read buffer content, optionally with start/end range |
| `InsertText` | Insert text at cursor, or replace text in start/end range |
| `GetSelections` | Get all selections/cursors with positions and text |
| `SetSelections` | Set multiple selections/cursors at specific positions |
| `OpenFile` | Open a file in editor with optional position |
| `SaveFile` | Save a file (active editor or specific path) |
| `CloseFile` | Close an editor tab |
| `GetProjectPaths` | Get project root folders |
| `AddProjectPath` | Add a folder to project roots |

### Tool Details

**GetActiveEditor** - Returns metadata only (no content):
```json
{ "path": "/file.js", "cursorPosition": {"row": 10, "column": 5}, "grammar": "JavaScript", "modified": false, "lineCount": 100, "charCount": 3000 }
```

**ReadText** - Read buffer content (includes unsaved changes):
```javascript
ReadText()                                    // Full content
ReadText({start: {row: 0, column: 0}, end: {row: 50, column: 0}})  // Range
```

**InsertText** - Insert or replace text:
```javascript
InsertText({text: "hello"})                   // At cursor
InsertText({text: "new", start: {...}, end: {...}})  // Replace range
```

## MCP Client Integration

The standalone MCP server (`lib/server.js`) can be used with any MCP-compatible client.

```json
{
  "mcpServers": {
    "pulsar": {
      "command": "node",
      "args": ["/path/to/pulsar-mcp/lib/server.js"],
      "env": {
        "PULSAR_BRIDGE_PORT": "3000"
      }
    }
  }
}
```

## Extending with Custom Tools

Other Pulsar packages can provide additional MCP tools by implementing the `mcp-tools` service:

```javascript
// In your package.json
{
  "providedServices": {
    "mcp-tools": {
      "versions": {
        "1.0.0": "provideMcpTools"
      }
    }
  }
}

// In your main.js
provideMcpTools() {
  return [
    {
      name: "MyCustomTool",
      description: "Description for the AI",
      inputSchema: {
        type: "object",
        properties: {
          param: { type: "string", description: "Parameter description" }
        },
        required: ["param"]
      },
      annotations: { readOnlyHint: true },
      execute({ param }) {
        // Tool implementation
        return { result: "data" };
      }
    }
  ];
}
```

### Tool Annotations

MCP 2025-11-25 supports tool annotations to hint behavior:

| Annotation | Description |
|------------|-------------|
| `readOnlyHint` | `true` if tool only reads data, `false` if it modifies state |
| `destructiveHint` | `true` if tool performs destructive actions (e.g., closing files) |

## Service API

The `pulsar-mcp` service provides:

```javascript
// Get the service
consumePulsarMcp(service) {
  // Get current bridge port
  const port = service.getBridgePort();

  // Check if bridge is running
  const running = service.isRunning();

  // Get path to MCP server script
  const serverPath = service.getServerPath();
}
```

# Contributing

Got ideas to make this package better, found a bug, or want to help add new features? Just drop your thoughts on GitHub — any feedback’s welcome!

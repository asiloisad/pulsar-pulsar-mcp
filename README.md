# pulsar-mcp

MCP (Model Context Protocol) server for Pulsar editor - provides editor tools to Claude and other AI assistants.

## Features

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

### Editor Tools

| Tool | Description |
|------|-------------|
| `GetActiveEditor` | Get active editor state (path, content, cursor, grammar, modified) |
| `InsertText` | Insert text at cursor or replace selection |
| `GetSelections` | Get all selections/cursors with positions and text |

### File Tools

| Tool | Description |
|------|-------------|
| `OpenFile` | Open a file in editor with optional position |
| `SaveFile` | Save a file (active editor or specific path) |
| `CloseFile` | Close an editor tab |

### Project Tools

| Tool | Description |
|------|-------------|
| `GetProjectPaths` | Get project root folders |
| `AddProjectPath` | Add a folder to project roots |

## Claude CLI Integration

Add to your Claude MCP settings (`~/.claude/claude_desktop_config.json`):

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
  return {
    getTools: () => [
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
        execute: async (args) => {
          // Tool implementation
          return { result: "data" };
        }
      }
    ]
  };
}
```

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

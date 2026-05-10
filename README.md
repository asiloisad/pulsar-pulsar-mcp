# pulsar-mcp

Model Context Protocol server, that provides Pulsar editor tools to AI assistants.

## Features

- **MCP protocol**: Version 2025-11-25 with tool annotations support.
- **HTTP bridge**: Server running inside Pulsar for direct API access.
- **Standalone server**: MCP server script for Claude CLI integration.
- **Editor tools**: Get/set content, open/save files, manage selections.
- **Extensible**: Other packages can register tools via `mcp-tools` service.
- **Toggle tools**: Enable/disable individual tools via select list. Destructive tools disabled by default.
- **[claude-chat](https://web.pulsar-edit.dev/packages/claude-chat) integration**: Auto-connects the MCP server to each Claude session via the provided service.

## Installation

To install `pulsar-mcp` search for [pulsar-mcp](https://web.pulsar-edit.dev/packages/pulsar-mcp) in the Install pane of the Pulsar settings or run `ppm install pulsar-mcp`. Alternatively, you can run `ppm install asiloisad/pulsar-pulsar-mcp` to install a package directly from the GitHub repository.

## Commands

Commands available in `atom-workspace`:

- `pulsar-mcp:toggle-tools`: toggle individual tools on/off,
- `pulsar-mcp:start`: start the MCP bridge server,
- `pulsar-mcp:stop`: stop the MCP bridge server,
- `pulsar-mcp:status`: show current bridge status and port.

Commands available in `.pulsar-mcp`:

- `select-list:enable-all`: <kbd>Alt+=</kbd> enable all tools,
- `select-list:disable-all`: <kbd>Alt+-</kbd> disable all tools,
- `select-list:reset-defaults`: <kbd>Alt+0</kbd> reset to defaults.

## Built-in Tools

| Tool | Description | Default |
| --- | --- | --- |
| `GetActiveEditor` | Get editor metadata (path, grammar, modified, lineCount) | Enabled |
| `GetOpenEditors` | Get metadata for all open text editors | Enabled |
| `ReadText` | Read active editor content with line pagination (use agent's file tools for other files) | Enabled |
| `WriteText` | Write text at cursor or replace range in active editor (use agent's file tools for other files) | Enabled |
| `OpenFile` | Open an existing file in editor with optional position (`create=true` allows new files) | Enabled |
| `SaveFile` | Save a file (active editor or specific path) | Enabled |
| `GetSelections` | Get all selections/cursors with positions and text from active editor | Enabled |
| `SetSelections` | Set multiple selections/cursors at specific positions in active editor | Enabled |
| `CloseFile` | Close an editor tab | Disabled |
| `GetProjectPaths` | Get project root folders | Enabled |
| `AddProjectPath` | Add a folder to project roots | Enabled |
| `RemoveProjectPath` | Remove a folder from project roots | Disabled |

## MCP Client Integration

The standalone MCP server (`lib/server.js`) can be used with any MCP-compatible client. The server connects to the Pulsar bridge via `PULSAR_BRIDGE_PORT` (default `3000`). Check the actual port with `pulsar-mcp:status`. It auto-increments when multiple Pulsar windows are open.

### Claude Code

Register the server with the Claude CLI:

```bash
claude mcp add -e PULSAR_BRIDGE_PORT=3000 pulsar -- node ~/.pulsar/packages/pulsar-mcp/lib/server.js
```

On Windows:

```bash
claude mcp add -e PULSAR_BRIDGE_PORT=3000 pulsar -- node "%USERPROFILE%\.pulsar\packages\pulsar-mcp\lib\server.js"
```

### JSON config

```json
{
  "mcpServers": {
    "pulsar": {
      "command": "node",
      "args": ["~/.pulsar/packages/pulsar-mcp/lib/server.js"],
      "env": {
        "PULSAR_BRIDGE_PORT": "3000"
      }
    }
  }
}
```

On Windows, use `"%USERPROFILE%\.pulsar\packages\pulsar-mcp\lib\server.js"`.

## Provided Service `pulsar-mcp`

Provides access to the MCP bridge state: port, running status, and server script path. Used by [claude-chat](https://web.pulsar-edit.dev/packages/claude-chat) to auto-connect the MCP server.

In your `package.json`:

```json
{
  "consumedServices": {
    "pulsar-mcp": {
      "versions": {
        "1.0.0": "consumePulsarMcp"
      }
    }
  }
}
```

In your main module:

```javascript
consumePulsarMcp(service) {
  // Get current bridge port
  const port = service.getBridgePort();

  // Check if bridge is running
  const running = service.isRunning();

  // Get path to MCP server script
  const serverPath = service.getServerPath();
}
```

## Consumed Service `mcp-tools`

Other Pulsar packages can provide additional MCP tools by implementing the `mcp-tools` service. Each tool defines a name, description, input schema, and execute function.

In your `package.json`:

```json
{
  "providedServices": {
    "mcp-tools": {
      "versions": {
        "1.0.0": "provideMcpTools"
      }
    }
  }
}
```

In your main module:

```javascript
module.exports = {
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
}
```

## Contributing

Got ideas to make this package better, found a bug, or want to help add new features? Just drop your thoughts on GitHub. Any feedback is welcome!

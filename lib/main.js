const { CompositeDisposable, Disposable } = require("atom");
const { startBridge, stopBridge, setExternalTools } = require("./bridge");
const { createLogger } = require("./log");

const log = createLogger("Main");

// External MCP tools registered by other packages
const externalTools = new Map();

module.exports = {
  subscriptions: null,
  bridge: null,
  bridgePort: null,

  activate() {
    log.debug("Activating pulsar-mcp package");
    this.subscriptions = new CompositeDisposable();

    // Register commands
    this.subscriptions.add(
      atom.commands.add("atom-workspace", {
        "pulsar-mcp:start": () => this.start(),
        "pulsar-mcp:stop": () => this.stop(),
        "pulsar-mcp:status": () => this.showStatus(),
      })
    );

    // Auto-start if enabled
    if (atom.config.get("pulsar-mcp.autoStart")) {
      this.startBridge();
    }
  },

  deactivate() {
    log.debug("Deactivating pulsar-mcp package");
    this.subscriptions?.dispose();
    this.stopBridge();
  },

  serialize() {
    return {};
  },

  // Command handlers
  async start() {
    if (this.bridge) {
      atom.notifications.addInfo("MCP bridge is already running", {
        detail: `Port: ${this.bridgePort}`,
      });
      return;
    }
    await this.startBridge();
    if (this.bridge) {
      atom.notifications.addSuccess("MCP bridge started", {
        detail: `Port: ${this.bridgePort}`,
      });
    }
  },

  async stop() {
    if (!this.bridge) {
      atom.notifications.addInfo("MCP bridge is not running");
      return;
    }
    await this.stopBridge();
    atom.notifications.addSuccess("MCP bridge stopped");
  },

  showStatus() {
    if (this.bridge) {
      atom.notifications.addInfo("MCP bridge is running", {
        detail: `Port: ${this.bridgePort}\nHost: 127.0.0.1\nURL: http://127.0.0.1:${this.bridgePort}`,
        dismissable: true,
      });
    } else {
      atom.notifications.addInfo("MCP bridge is not running", {
        detail: "Use 'Pulsar MCP: Start' command to start the bridge",
        dismissable: true,
      });
    }
  },

  // Bridge management
  async startBridge() {
    if (this.bridge) {
      log.debug("Bridge already running");
      return;
    }

    try {
      const basePort = atom.config.get("pulsar-mcp.bridgePort") || 3000;
      log.debug("Starting MCP bridge", { basePort });

      this.bridge = await startBridge({ port: basePort });
      this.bridgePort = this.bridge.port;

      log.debug(`MCP bridge started on port ${this.bridgePort}`);
    } catch (error) {
      log.error("Failed to start MCP bridge", error);
      atom.notifications.addError("Failed to start MCP bridge", {
        detail: error.message,
        dismissable: true,
      });
    }
  },

  async stopBridge() {
    if (this.bridge) {
      log.debug("Stopping MCP bridge");
      try {
        await stopBridge(this.bridge);
        log.debug("MCP bridge stopped");
      } catch (err) {
        log.error("Error stopping bridge", err);
      }
      this.bridge = null;
      this.bridgePort = null;
    }
  },

  /**
   * Service API for other packages (e.g., claude-chat)
   * Provides access to the MCP bridge
   */
  provideService() {
    return {
      /**
       * Get the current MCP bridge port
       * @returns {number|null} The port number or null if bridge not running
       */
      getBridgePort: () => this.bridgePort,

      /**
       * Check if the bridge is running
       * @returns {boolean}
       */
      isRunning: () => this.bridge !== null,

      /**
       * Get the path to the MCP server script
       * @returns {string} Absolute path to server.js
       */
      getServerPath: () => require.resolve("./server"),
    };
  },

  /**
   * Consume mcp-tools service from external packages
   * External packages provide tools via providedServices in package.json
   *
   * @param {Array} tools - Array of tool definitions
   * @returns {Disposable} - Disposable to unregister tools when package deactivates
   */
  consumeMcpTools(tools) {
    if (!Array.isArray(tools)) {
      log.error("Invalid MCP tools provider: must return an array of tools");
      return new Disposable();
    }

    const registeredNames = [];
    for (const tool of tools) {
      if (!tool.name || !tool.execute) {
        log.error("Invalid tool definition: must have name and execute", {
          tool,
        });
        continue;
      }
      externalTools.set(tool.name, tool);
      registeredNames.push(tool.name);
      log.debug(`Registered external MCP tool: ${tool.name}`);
    }

    // Update bridge with new tools
    setExternalTools(externalTools);

    log.debug(`Registered ${registeredNames.length} external MCP tools`);

    // Return disposable for cleanup
    return new Disposable(() => {
      for (const name of registeredNames) {
        externalTools.delete(name);
      }
      setExternalTools(externalTools);
      log.debug(
        `Unregistered external MCP tools: ${registeredNames.join(", ")}`
      );
    });
  },
};

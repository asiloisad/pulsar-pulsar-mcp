/**
 * Simple logging for pulsar-mcp
 */

const PREFIX = "[pulsar-mcp]";

function isDebugEnabled() {
  return atom.config.get("pulsar-mcp.debugMode") === true;
}

function createLogger(category) {
  return {
    debug: (...args) =>
      isDebugEnabled() && console.log(`${PREFIX} [${category}]`, ...args),
    info: (...args) => console.log(`${PREFIX} [${category}]`, ...args),
    warn: (...args) => console.warn(`${PREFIX} [${category}]`, ...args),
    error: (...args) => console.error(`${PREFIX} [${category}]`, ...args),
  };
}

module.exports = { createLogger };

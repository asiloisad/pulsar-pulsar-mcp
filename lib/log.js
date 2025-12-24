/**
 * Debug logging utility for pulsar-mcp
 * Only logs when debugMode config is enabled
 */

const PREFIX = "[pulsar-mcp]";

/**
 * Check if debug mode is enabled
 */
function isDebugEnabled() {
  return atom.config.get("pulsar-mcp.debugMode") === true;
}

/**
 * Format arguments for logging
 */
function formatArgs(args) {
  return args.map((arg) => {
    if (typeof arg === "object" && arg !== null) {
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return String(arg);
      }
    }
    return arg;
  });
}

/**
 * Debug log - only outputs when debugMode is enabled
 */
function debug(category, ...args) {
  if (!isDebugEnabled()) return;
  console.log(`${PREFIX} [${category}]`, ...formatArgs(args));
}

/**
 * Info log - always outputs
 */
function info(category, ...args) {
  console.log(`${PREFIX} [${category}]`, ...args);
}

/**
 * Warning log - always outputs
 */
function warn(category, ...args) {
  console.warn(`${PREFIX} [${category}]`, ...args);
}

/**
 * Error log - always outputs
 */
function error(category, ...args) {
  console.error(`${PREFIX} [${category}]`, ...args);
}

/**
 * Create a scoped logger for a specific category
 */
function createLogger(category) {
  return {
    debug: (...args) => debug(category, ...args),
    info: (...args) => info(category, ...args),
    warn: (...args) => warn(category, ...args),
    error: (...args) => error(category, ...args),
  };
}

module.exports = {
  debug,
  info,
  warn,
  error,
  createLogger,
  isDebugEnabled,
};

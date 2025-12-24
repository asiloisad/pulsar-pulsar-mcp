/**
 * Tool registry for MCP bridge
 * Maps tool names to implementations with validation and response formatting
 */

/**
 * Validator helpers
 */
const validators = {
  string: (value, name) =>
    typeof value === "string" ? null : `${name} is required`,

  number: (value, name) =>
    typeof value === "number" ? null : `${name} is required`,

  array: (value, name) =>
    Array.isArray(value) && value.length > 0 ? null : `${name} array is required`,

  enum: (value, name, allowed) =>
    allowed.includes(value) ? null : `${name} must be one of: ${allowed.join(", ")}`,

  optional: () => null,
};

/**
 * Create a tool definition
 * @param {Object} config
 * @param {Function} config.execute - Tool execution function
 * @param {Object} config.validate - Validation rules { argName: validatorFn }
 * @param {Function} config.format - Format result into response data
 */
function defineTool({ execute, validate = {}, format = (r) => r }) {
  return { execute, validate, format };
}

/**
 * Execute a tool from the registry
 * @param {Object} registry - Tool registry
 * @param {string} toolName - Name of the tool
 * @param {Object} args - Tool arguments
 */
async function executeFromRegistry(registry, toolName, args = {}) {
  const tool = registry[toolName];
  if (!tool) {
    return { success: false, error: `Unknown tool: ${toolName}` };
  }

  // Run validation
  for (const [argName, validator] of Object.entries(tool.validate)) {
    const error = validator(args[argName], argName);
    if (error) {
      return { success: false, error };
    }
  }

  try {
    const result = await tool.execute(args);
    const data = tool.format(result, args);
    return { success: result !== false && result !== null, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

module.exports = {
  validators,
  defineTool,
  executeFromRegistry,
};

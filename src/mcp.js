const { startMcpServer } = require('./services/mcpService');

// Start the MCP server
startMcpServer().catch(console.error);
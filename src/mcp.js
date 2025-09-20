const express = require('express');
const { startMcpServer } = require('./services/mcpService');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');

// Create Express app for MCP HTTP server
const app = express();
const port = process.env.MCP_PORT || 3001;

// Middleware to parse JSON bodies
app.use(express.json({ limit: '4mb' }));

// Start the MCP server with HTTP transport
async function startHttpMcpServer() {
  try {
    const server = await startMcpServer();
    
    // Create HTTP transport
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => undefined, // Stateless mode
    });
    
    // Connect server with transport
    await server.connect(transport);
    
    // Handle MCP requests
    app.post('/mcp', async (req, res) => {
      await transport.handleRequest(req, res, req.body);
    });
    
    // Start Express server
    const serverInstance = app.listen(port, () => {
      console.log(`MCP server listening on port ${port}`);
      console.log(`MCP endpoint: http://localhost:${port}/mcp`);
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('Shutting down MCP server...');
      serverInstance.close();
      process.exit(0);
    });
  } catch (error) {
    console.error('MCP server failed to start:', error.message);
    console.error(error.stack);
    process.exitCode = 1;
  }
}

startHttpMcpServer();
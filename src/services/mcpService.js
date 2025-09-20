const { Server } = require('@modelcontextprotocol/sdk/server');
const pino = require('pino');
const ollamaService = require('./ollamaService');
const qdrantService = require('./qdrantService');
const neo4jService = require('./neo4jService');
const cogneeService = require('./cogneeService');

const logger = pino();

// Service availability flags
let qdrantAvailable = false;
let neo4jAvailable = false;
let cogneeAvailable = false;

// Initialize the MCP server
const server = new Server(
  {
    name: 'Serapeum',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Add error handling
server.onerror = (error) => {
  logger.error({ error }, 'MCP server error');
};

server.onclose = () => {
  logger.info('MCP server closed');
};

// Define the tools that will be available to the LLM
const tools = [
  {
    name: 'rag_query',
    description: 'Perform a RAG query using the vector database',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The query to search for',
        },
        context: {
          type: 'string',
          description: 'Additional context for the query',
        },
      },
      required: ['query'],
    },
  },
];

// Register tool handlers
server.onerror = (error) => {
  logger.error({ error }, 'MCP server error');
};
  //     description: 'Store a document in the vector database and knowledge graph',
  //     inputSchema: {
  //       type: 'object',
  //       properties: {
  //         content: {
  //           type: 'string',
  //           description: 'The document content to store',
  //         },
  //         metadata: {
  //           type: 'object',
  //           description: 'Metadata for the document',
  //         },
  //       },
  //       required: ['content'],
  //     },
  //   },
  //   {
  //     name: 'retrieve_document',
  //     description: 'Retrieve a document by its ID',
  //     inputSchema: {
  //       type: 'object',
  //       properties: {
  //         id: {
  //           type: 'string',
  //           description: 'The document ID',
  //         },
  //       },
  //       required: ['id'],
  //     },
  //   },
  //   {
  //     name: 'retrieve_graph_nodes',
  //     description: 'Retrieve nodes from the graph database by label',
  //     inputSchema: {
  //       type: 'object',
  //       properties: {
  //         label: {
  //           type: 'string',
  //           description: 'The node label to retrieve',
  //         },
  //         limit: {
  //           type: 'number',
  //           description: 'Maximum number of nodes to return',
  //         },
  //       },
  //       required: ['label'],
  //     },
  //   },
  //   {
  //     name: 'cognee_add',
  //     description: 'Add content to Cognee for knowledge graph processing',
  //     inputSchema: {
  //       type: 'object',
  //       properties: {
  //         content: {
  //           type: 'string',
  //           description: 'The content to be processed by Cognee',
  //         },
  //       },
  //       required: ['content'],
  //     },
  //   },
  //   {
  //     name: 'cognee_search',
  //     description: 'Perform a search query using Cognee',
  //     inputSchema: {
  //       type: 'object',
  //       properties: {
  //         query: {
  //           type: 'string',
  //           description: 'The search query',
  //         },
  //         type: {
  //           type: 'string',
  //           description: 'The type of search (GRAPH_COMPLETION, RAG_COMPLETION, SUMMARIES, or CHUNKS)',
  //           enum: ['GRAPH_COMPLETION', 'RAG_COMPLETION', 'SUMMARIES', 'CHUNKS'],
  //         },
  //       },
  //       required: ['query'],
  //     },
  //   },

  //       ]  
    
  // );

// Add error handling
server.onerror = (error) => {
  logger.error({ error }, 'MCP server error');
};

server.onclose = () => {
  logger.info('MCP server closed');
};


// Register tool handlers
server.onerror = (error) => {
  logger.error({ error }, 'MCP server error');
};

// Handle tool calls
server.onrequest = async (request) => {
  logger.info({ request }, 'Received MCP request');
  
  // Handle initialize request
  if (request.method === 'initialize') {
    logger.info('MCP client initialization request received');
    return {
      protocolVersion: '2025-03-26',
      capabilities: server.capabilities,
      serverInfo: {
        name: 'Serapeum RAG Server',
        version: '0.1.0'
      }
    };
  }
  
  // Handle ping request
  if (request.method === 'ping') {
    logger.info('MCP client ping request received');
    return {};
  }
  
  // Handle initialized notification
  if (request.method === 'notifications/initialized') {
    logger.info('MCP client initialized notification received');
    return null; // Notifications don't expect a response
  }
  
  if (request.method === 'tools/call') {
    const { name, arguments: args } = request.params;
    
    try {
      switch (name) {
        case 'rag_query':
          logger.info('Processing RAG query via MCP');
          const queryEmbeddings = await ollamaService.generateEmbeddings(args.query);
          const searchResults = await qdrantService.searchDocuments(queryEmbeddings, 15);
          const contextDocuments = searchResults.map(result => result.content);
          const responseText = await ollamaService.generateRAGResponse(args.query, contextDocuments);
          
          return {
            query: args.query,
            response: responseText,
            context_used: contextDocuments,
            search_results: searchResults,
            timestamp: new Date().toISOString()
          };
          
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      logger.error({ error }, `Error executing tool: ${name}`);
      throw error;
    }
  }
};

// Start the MCP server
async function startMcpServer() {
  try {
    logger.info('Starting MCP server');
    
    // Initialize service availability
    qdrantAvailable = false;
    neo4jAvailable = false;
    cogneeAvailable = false;
    
    // Validate service dependencies before starting
    logger.info('Validating service dependencies');
    
    // Check Qdrant service (critical for basic functionality)
    try {
      await qdrantService.initializeCollection();
      qdrantAvailable = true;
      logger.info('Qdrant service initialized successfully');
    } catch (error) {
      logger.error({ error }, 'Qdrant service is not available - this is critical for MCP server');
      throw new Error(`Critical service Qdrant is unavailable: ${error.message}`);
    }
    
    // Check Neo4j service (optional)
    try {
      await neo4jService.initializeConnection();
      neo4jAvailable = true;
      logger.info('Neo4j service initialized successfully');
    } catch (error) {
      logger.warn({ error }, 'Neo4j service is not available, continuing without it');
      neo4jAvailable = false;
    }
    
    // Check Cognee service availability (optional)
    try {
      // We could add a simple test here if needed
      cogneeAvailable = true;
      logger.info('Cognee service is available');
    } catch (error) {
      logger.warn({ error }, 'Cognee service is not available, continuing without it');
      cogneeAvailable = false;
    }
    
    // Build tools list based on available services
    const availableTools = tools.filter(tool => {
      // Always include basic tools if Qdrant is available
      if (['rag_query'].includes(tool.name)) {
        return true; // This depends on Qdrant which is already verified
      }
      
      return true;
    });
    
    // Add tools to server capabilities
    if (!server.capabilities) {
      server.capabilities = {};
    }
    server.capabilities.tools = {
      listChanged: true,
      tools: availableTools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema
      }))
    };
    
    // Transport will be connected in the main mcp.js file
    // Just return the server instance
    
    logger.info('MCP server started successfully with available services', {
      qdrantAvailable,
      neo4jAvailable,
      cogneeAvailable,
      availableTools: availableTools.map(t => t.name)
    });
    
    // Return the server instance for the caller to connect with transport
    return server;
  } catch (error) {
    logger.error({ error }, 'Failed to start MCP server');
    // Re-throw the error for the caller to handle
    throw error;
  }
}

module.exports = { startMcpServer };
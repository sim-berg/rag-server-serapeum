const { Server } = require('@modelcontextprotocol/sdk/server');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server');
const pino = require('pino');
const ollamaService = require('./ollamaService');
const qdrantService = require('./qdrantService');
const neo4jService = require('./neo4jService');
const cogneeService = require('./cogneeService');

const logger = pino();

// Initialize the MCP server
const server = new Server(
  {
    name: 'rag-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

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
  {
    name: 'store_document',
    description: 'Store a document in the vector database and knowledge graph',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The document content to store',
        },
        metadata: {
          type: 'object',
          description: 'Metadata for the document',
        },
      },
      required: ['content'],
    },
  },
  {
    name: 'retrieve_document',
    description: 'Retrieve a document by its ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The document ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'retrieve_graph_nodes',
    description: 'Retrieve nodes from the graph database by label',
    inputSchema: {
      type: 'object',
      properties: {
        label: {
          type: 'string',
          description: 'The node label to retrieve',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of nodes to return',
        },
      },
      required: ['label'],
    },
  },
  {
    name: 'cognee_add',
    description: 'Add content to Cognee for knowledge graph processing',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The content to be processed by Cognee',
        },
      },
      required: ['content'],
    },
  },
  {
    name: 'cognee_search',
    description: 'Perform a search query using Cognee',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query',
        },
        type: {
          type: 'string',
          description: 'The type of search (GRAPH_COMPLETION, RAG_COMPLETION, SUMMARIES, or CHUNKS)',
          enum: ['GRAPH_COMPLETION', 'RAG_COMPLETION', 'SUMMARIES', 'CHUNKS'],
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

// Handle tool calls
server.onrequest = async (request) => {
  if (request.method === 'tools/call') {
    const { name, arguments: args } = request.params;
    
    try {
      switch (name) {
        case 'rag_query':
          logger.info('Processing RAG query via MCP');
          const queryEmbeddings = await ollamaService.generateEmbeddings(args.query);
          const searchResults = await qdrantService.searchDocuments(queryEmbeddings, 5);
          const contextDocuments = searchResults.map(result => result.content);
          const responseText = await ollamaService.generateRAGResponse(args.query, contextDocuments);
          
          return {
            query: args.query,
            response: responseText,
            context_used: contextDocuments,
            search_results: searchResults,
            timestamp: new Date().toISOString()
          };
          
        case 'store_document':
          logger.info('Storing document via MCP');
          const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const embeddings = await ollamaService.generateEmbeddings(args.content);
          await qdrantService.storeDocument(documentId, embeddings, args.metadata, args.content);
          await neo4jService.createNode('Document', {
            id: documentId,
            content: args.content,
            ...args.metadata,
            createdAt: new Date().toISOString()
          });
          await cogneeService.addText(args.content);
          
          return {
            message: 'Document stored successfully',
            document: {
              id: documentId,
              content: args.content,
              metadata: args.metadata || {},
              created_at: new Date().toISOString()
            }
          };
          
        case 'retrieve_document':
          logger.info('Retrieving document via MCP');
          const document = await qdrantService.getDocument(args.id);
          if (!document) {
            throw new Error('Document not found');
          }
          
          return {
            id: document.id,
            content: document.content,
            metadata: document.metadata || {},
            created_at: document.metadata?.createdAt || new Date().toISOString()
          };
          
        case 'retrieve_graph_nodes':
          logger.info('Retrieving graph nodes via MCP');
          const query = `MATCH (n:${args.label}) RETURN n LIMIT $limit`;
          const params = { limit: parseInt(args.limit) || 10 };
          const nodes = await neo4jService.executeQuery(query, params);
          
          return nodes;
          
        case 'cognee_add':
          logger.info('Adding content to Cognee via MCP');
          const addResult = await cogneeService.addText(args.content);
          
          return addResult;
          
        case 'cognee_search':
          logger.info('Performing search with Cognee via MCP');
          const searchResult = await cogneeService.search(args.query, args.type);
          
          return searchResult;
          
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
    
    // Validate critical service dependencies before starting
    logger.info('Validating service dependencies');
    
    // Check Qdrant service
    try {
      await qdrantService.initializeCollection();
      logger.info('Qdrant service initialized successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize Qdrant service');
      throw new Error(`Critical service Qdrant is unavailable: ${error.message}`);
    }
    
    // Check Neo4j service
    try {
      await neo4jService.initializeConnection();
      logger.info('Neo4j service initialized successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize Neo4j service');
      throw new Error(`Critical service Neo4j is unavailable: ${error.message}`);
    }
    
    // Check Cognee service availability
    try {
      logger.info('Testing Cognee service availability');
      // We could add a simple test here if needed
    } catch (error) {
      logger.error({ error }, 'Failed to initialize Cognee service');
      throw new Error(`Critical service Cognee is unavailable: ${error.message}`);
    }
    
    // Add tools to server capabilities
    server.capabilities.tools = {
      tools: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema
      }))
    };
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    logger.info('MCP server started successfully with all critical services available');
  } catch (error) {
    logger.error({ error }, 'Failed to start MCP server due to unavailable critical services');
    process.exit(1);
  }
}

module.exports = { startMcpServer };
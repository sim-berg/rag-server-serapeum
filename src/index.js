const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const pino = require('pino');
require('dotenv').config();

// Initialize logger
const logger = pino();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('combined'));

// Import services
const ollamaService = require('./services/ollamaService');
const qdrantService = require('./services/qdrantService');
const neo4jService = require('./services/neo4jService');
const cogneeService = require('./services/cogneeService');

// Initialize services
const initializeServices = async () => {
  // Skip initialization in test mode
  if (process.env.TEST_MODE === 'true') {
    logger.info('Skipping service initialization in test mode');
    return;
  }
  
  try {
    await qdrantService.initializeCollection();
    await neo4jService.initializeConnection();
    logger.info('Services initialized successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize services');
    process.exit(1);
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  logger.info('Health check requested');
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// RAG API endpoints
app.post('/api/v1/query', async (req, res) => {
  const { query, context } = req.body;
  
  // Basic validation
  if (!query) {
    logger.warn('Query missing in request');
    return res.status(400).json({ error: 'Query is required' });
  }
  
  try {
    logger.info('Processing RAG query');
    
    // Generate embeddings for the query
    const queryEmbeddings = await ollamaService.generateEmbeddings(query);
    
    // Search for similar documents in Qdrant
    const searchResults = await qdrantService.searchDocuments(queryEmbeddings, 5);
    
    // Extract content from search results
    const contextDocuments = searchResults.map(result => result.content);
    
    // Generate response using Ollama with context
    const responseText = await ollamaService.generateRAGResponse(query, contextDocuments);
    
    const response = {
      query: query,
      response: responseText,
      context_used: contextDocuments,
      search_results: searchResults,
      timestamp: new Date().toISOString()
    };
    
    logger.info('RAG query processed successfully');
    res.status(200).json(response);
  } catch (error) {
    logger.error({ error }, 'Error processing RAG query');
    res.status(500).json({ error: `Error processing query: ${error.message}` });
  }
});

// Document management endpoints
app.post('/api/v1/documents', async (req, res) => {
  const { content, metadata } = req.body;
  
  if (!content) {
    logger.warn('Content missing in document storage request');
    return res.status(400).json({ error: 'Content is required' });
  }
  
  try {
    logger.info('Storing document');
    
    // Generate a unique ID for the document
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Generate embeddings for the document content
    const embeddings = await ollamaService.generateEmbeddings(content);
    
    // Store the document and its embeddings in Qdrant
    await qdrantService.storeDocument(documentId, embeddings, metadata, content);
    
    // Create a node in Neo4j for the document
    await neo4jService.createNode('Document', {
      id: documentId,
      content: content,
      ...metadata,
      createdAt: new Date().toISOString()
    });
    
    // Add document to Cognee for knowledge graph processing
    await cogneeService.addText(content);
    
    const document = {
      id: documentId,
      content: content,
      metadata: metadata || {},
      created_at: new Date().toISOString()
    };
    
    logger.info({ documentId: document.id }, 'Document stored successfully');
    res.status(201).json({ 
      message: 'Document stored successfully', 
      document: document 
    });
  } catch (error) {
    logger.error({ error }, 'Error storing document');
    res.status(500).json({ error: `Error storing document: ${error.message}` });
  }
});

app.get('/api/v1/documents/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    logger.info({ documentId: id }, 'Retrieving document');
    
    // Retrieve the document from Qdrant by ID
    const document = await qdrantService.getDocument(id);
    
    if (!document) {
      logger.warn({ documentId: id }, 'Document not found');
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const response = {
      id: document.id,
      content: document.content,
      metadata: document.metadata || {},
      created_at: document.metadata?.createdAt || new Date().toISOString()
    };
    
    logger.info({ documentId: id }, 'Document retrieved successfully');
    res.status(200).json(response);
  } catch (error) {
    logger.error({ error, documentId: id }, 'Error retrieving document');
    res.status(500).json({ error: `Error retrieving document: ${error.message}` });
  }
});

// Neo4j API endpoints
app.get('/api/v1/graph/:label', async (req, res) => {
  const { label } = req.params;
  const { limit = 10 } = req.query;
  
  try {
    logger.info({ label }, 'Retrieving nodes from graph');
    
    const query = `MATCH (n:${label}) RETURN n LIMIT $limit`;
    const params = { limit: parseInt(limit) };
    const nodes = await neo4jService.executeQuery(query, params);
    
    logger.info({ label, count: nodes.length }, 'Nodes retrieved successfully');
    res.status(200).json(nodes);
  } catch (error) {
    logger.error({ error, label }, 'Error retrieving nodes from graph');
    res.status(500).json({ error: `Error retrieving nodes: ${error.message}` });
  }
});

// Cognee API endpoints
app.post('/api/v1/cognee/add', async (req, res) => {
  const { content } = req.body;
  
  if (!content) {
    logger.warn('Content missing in Cognee add request');
    return res.status(400).json({ error: 'Content is required' });
  }
  
  try {
    logger.info('Adding content to Cognee');
    
    const result = await cogneeService.addText(content);
    
    logger.info('Content added to Cognee successfully');
    res.status(200).json(result);
  } catch (error) {
    logger.error({ error }, 'Error adding content to Cognee');
    res.status(500).json({ error: `Error adding content to Cognee: ${error.message}` });
  }
});

app.post('/api/v1/cognee/search', async (req, res) => {
  const { query, type } = req.body;
  
  if (!query) {
    logger.warn('Query missing in Cognee search request');
    return res.status(400).json({ error: 'Query is required' });
  }
  
  try {
    logger.info('Performing search with Cognee');
    
    const results = await cogneeService.search(query, type);
    
    logger.info('Search completed successfully');
    res.status(200).json(results);
  } catch (error) {
    logger.error({ error }, 'Error performing search with Cognee');
    res.status(500).json({ error: `Error performing search with Cognee: ${error.message}` });
  }
});

// 404 handler
app.use('*', (req, res) => {
  logger.warn({ url: req.originalUrl }, 'Endpoint not found');
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error({ error: err.stack }, 'Unhandled error occurred');
  res.status(500).json({ error: 'Something went wrong!' });
});

// Initialize services and start server
initializeServices().then(() => {
  app.listen(PORT, () => {
    logger.info(`RAG Server listening on port ${PORT}`);
  });
});

// Close Neo4j connection on process termination
process.on('SIGINT', async () => {
  logger.info('Shutting down server');
  await neo4jService.closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down server');
  await neo4jService.closeConnection();
  process.exit(0);
});

module.exports = app;
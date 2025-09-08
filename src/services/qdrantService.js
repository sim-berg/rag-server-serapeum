const { QdrantClient } = require('@qdrant/js-client-rest');
const pino = require('pino');
const logger = pino();

class QdrantService {
  constructor() {
    this.host = process.env.QDRANT_HOST || 'http://127.0.0.1:6333';
    this.collectionName = process.env.QDRANT_COLLECTION_NAME || 'rag-server-collection';
    this.apiKey = process.env.QDRANT_API_KEY || null;
    
    // Initialize Qdrant client
    this.client = new QdrantClient({
      url: this.host,
      ...(this.apiKey && { apiKey: this.apiKey })
    });
  }

  /**
   * Initialize the Qdrant collection
   * @returns {Promise<void>}
   */
  async initializeCollection() {
    try {
      logger.info(`Initializing Qdrant collection: ${this.collectionName}`);
      
      // Check if collection exists
      try {
        await this.client.getCollection(this.collectionName);
        logger.info(`Collection ${this.collectionName} already exists`);
        return;
      } catch (error) {
        // Collection doesn't exist, create it
        logger.info(`Creating new Qdrant collection: ${this.collectionName}`);
        
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: 4096, // Default dimension, adjust as needed
            distance: 'Cosine'
          }
        });
        
        logger.info('Qdrant collection initialized successfully');
      }
    } catch (error) {
      logger.error({ error }, 'Error initializing Qdrant collection');
      throw new Error(`Failed to initialize Qdrant collection: ${error.message}`);
    }
  }

  /**
   * Store a document with its embeddings
   * @param {string} id - Document ID
   * @param {Array<number>} embeddings - Document embeddings
   * @param {Object} metadata - Document metadata
   * @param {string} content - Document content
   * @returns {Promise<void>}
   */
  async storeDocument(id, embeddings, metadata = {}, content = '') {
    try {
      logger.info({ documentId: id }, 'Storing document in Qdrant');
      
      await this.client.upsert(this.collectionName, {
        points: [
          {
            id: id,
            vector: embeddings,
            payload: {
              ...metadata,
              content: content,
              createdAt: new Date().toISOString()
            }
          }
        ]
      });
      
      logger.info({ documentId: id }, 'Document stored successfully');
    } catch (error) {
      logger.error({ error, documentId: id }, 'Error storing document in Qdrant');
      throw new Error(`Failed to store document: ${error.message}`);
    }
  }

  /**
   * Retrieve a document by ID
   * @param {string} id - Document ID
   * @returns {Promise<Object>} - Document data
   */
  async getDocument(id) {
    try {
      logger.info({ documentId: id }, 'Retrieving document from Qdrant');
      
      const response = await this.client.retrieve(this.collectionName, [id]);
      
      if (!response.length) {
        logger.warn({ documentId: id }, 'Document not found');
        return null;
      }
      
      const document = response[0];
      
      logger.info({ documentId: id }, 'Document retrieved successfully');
      return {
        id: document.id,
        metadata: document.payload,
        content: document.payload?.content || ''
      };
    } catch (error) {
      logger.error({ error, documentId: id }, 'Error retrieving document from Qdrant');
      throw new Error(`Failed to retrieve document: ${error.message}`);
    }
  }

  /**
   * Search for similar documents
   * @param {Array<number>} queryEmbeddings - Query embeddings
   * @param {number} limit - Number of results to return
   * @returns {Promise<Array<Object>>} - Similar documents
   */
  async searchDocuments(queryEmbeddings, limit = 5) {
    try {
      logger.info('Searching for similar documents in Qdrant');
      
      const response = await this.client.search(this.collectionName, {
        vector: queryEmbeddings,
        limit: limit,
        with_payload: true
      });
      
      const results = response.map(match => ({
        id: match.id,
        score: match.score,
        metadata: match.payload,
        content: match.payload?.content || ''
      }));
      
      logger.info({ resultCount: results.length }, 'Document search completed');
      return results;
    } catch (error) {
      logger.error({ error }, 'Error searching documents in Qdrant');
      throw new Error(`Failed to search documents: ${error.message}`);
    }
  }
}

module.exports = new QdrantService();
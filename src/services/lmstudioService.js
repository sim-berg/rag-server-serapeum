const axios = require('axios');
const pino = require('pino');
const logger = pino();

class LMStudioService {
  constructor() {
    this.host = process.env.LMSTUDIO_HOST || 'http://127.0.0.1:1234';
    this.embeddingModel = process.env.LMSTUDIO_EMBEDDING_MODEL || 'nomic-ai/nomic-embed-text-v1.5-GGUF';
    this.completionModel = process.env.LMSTUDIO_COMPLETION_MODEL || 'bartowski/Llama-3.1-8B-Instruct-GGUF';
    
    // Create axios instance with base URL
    this.client = axios.create({
      baseURL: this.host,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Generate embeddings for text using LM Studio
   * @param {string} text - Text to generate embeddings for
   * @returns {Promise<Array<number>>} - Embeddings vector
   */
  async generateEmbeddings(text) {
    try {
      logger.info('Generating embeddings with LM Studio');
      
      const response = await this.client.post('/v1/embeddings', {
        input: text,
        model: this.embeddingModel
      });
      
      logger.info('Embeddings generated successfully');
      return response.data.data[0].embedding;
    } catch (error) {
      logger.error({ error }, 'Error generating embeddings');
      throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
  }

  /**
   * Generate a response using LM Studio
   * @param {string} prompt - Prompt to send to the model
   * @returns {Promise<string>} - Generated response
   */
  async generateResponse(prompt) {
    try {
      logger.info('Generating response with LM Studio');
      
      const response = await this.client.post('/v1/chat/completions', {
        model: this.completionModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500
      });
      
      logger.info('Response generated successfully');
      return response.data.choices[0].message.content;
    } catch (error) {
      logger.error({ error }, 'Error generating response');
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }

  /**
   * Generate a response using context and query
   * @param {string} query - User query
   * @param {Array<string>} context - Context documents
   * @returns {Promise<string>} - Generated response
   */
  async generateRAGResponse(query, context) {
    try {
      logger.info('Generating RAG response with LM Studio');
      
      // Create a prompt that includes the context
      const formattedContext = context.join('\n\n');
      const prompt = `Context information is below:
---------------------
${formattedContext}
---------------------
Given the above context information, answer the query.
Query: ${query}
Answer:`;
      
      const response = await this.client.post('/v1/chat/completions', {
        model: this.completionModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1000
      });
      
      logger.info('RAG response generated successfully');
      return response.data.choices[0].message.content;
    } catch (error) {
      logger.error({ error }, 'Error generating RAG response');
      throw new Error(`Failed to generate RAG response: ${error.message}`);
    }
  }
}

module.exports = new LMStudioService();
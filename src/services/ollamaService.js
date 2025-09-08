const ollama = require('ollama');
const pino = require('pino');
const logger = pino();

class OllamaService {
  constructor() {
    this.host = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama3.1';
    
    // Configure Ollama client with custom host if needed
    if (this.host !== 'http://127.0.0.1:11434') {
      ollama.host = this.host;
    }
  }

  /**
   * Generate embeddings for text using Ollama
   * @param {string} text - Text to generate embeddings for
   * @returns {Promise<Array<number>>} - Embeddings vector
   */
  async generateEmbeddings(text) {
    try {
      logger.info('Generating embeddings with Ollama');
      
      const response = await ollama.embeddings({
        model: this.model,
        prompt: text
      });
      
      logger.info('Embeddings generated successfully');
      return response.embedding;
    } catch (error) {
      logger.error({ error }, 'Error generating embeddings');
      throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
  }

  /**
   * Generate a response using Ollama
   * @param {string} prompt - Prompt to send to the model
   * @returns {Promise<string>} - Generated response
   */
  async generateResponse(prompt) {
    try {
      logger.info('Generating response with Ollama');
      
      const response = await ollama.chat({
        model: this.model,
        messages: [{ role: 'user', content: prompt }]
      });
      
      logger.info('Response generated successfully');
      return response.message.content;
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
      logger.info('Generating RAG response with Ollama');
      
      // Create a prompt that includes the context
      const formattedContext = context.join('\n\n');
      const prompt = `Context information is below:
---------------------
${formattedContext}
---------------------
Given the above context information, answer the query.
Query: ${query}
Answer:`;
      
      const response = await ollama.chat({
        model: this.model,
        messages: [{ role: 'user', content: prompt }]
      });
      
      logger.info('RAG response generated successfully');
      return response.message.content;
    } catch (error) {
      logger.error({ error }, 'Error generating RAG response');
      throw new Error(`Failed to generate RAG response: ${error.message}`);
    }
  }
}

module.exports = new OllamaService();
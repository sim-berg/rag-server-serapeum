const neo4j = require('neo4j-driver');
const pino = require('pino');
const logger = pino();

class Neo4jService {
  constructor() {
    this.uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
    this.username = process.env.NEO4J_USERNAME || 'neo4j';
    this.password = process.env.NEO4J_PASSWORD || 'password';
    this.driver = null;
  }

  /**
   * Initialize the Neo4j connection
   * @returns {Promise<void>}
   */
  async initializeConnection() {
    try {
      logger.info('Initializing Neo4j connection');
      
      // Initialize Neo4j driver only when needed
      this.driver = neo4j.driver(
        this.uri,
        neo4j.auth.basic(this.username, this.password),
        {
          disableLosslessIntegers: true
        }
      );
      
      await this.driver.verifyConnectivity();
      logger.info('Neo4j connection established successfully');
    } catch (error) {
      logger.error({ error }, 'Error initializing Neo4j connection');
      // Clean up the driver if it was created
      if (this.driver) {
        await this.driver.close().catch(() => {}); // Ignore errors during cleanup
        this.driver = null;
      }
      throw new Error(`Failed to initialize Neo4j connection: ${error.message}`);
    }
  }

  /**
   * Close the Neo4j connection
   * @returns {Promise<void>}
   */
  async closeConnection() {
    try {
      if (this.driver) {
        logger.info('Closing Neo4j connection');
        await this.driver.close();
        this.driver = null;
        logger.info('Neo4j connection closed successfully');
      }
    } catch (error) {
      logger.error({ error }, 'Error closing Neo4j connection');
      throw new Error(`Failed to close Neo4j connection: ${error.message}`);
    }
  }

  /**
   * Execute a Cypher query
   * @param {string} query - Cypher query to execute
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} - Query results
   */
  async executeQuery(query, params = {}) {
    if (!this.driver) {
      throw new Error('Neo4j connection not initialized');
    }
    
    const session = this.driver.session();
    try {
      logger.info('Executing Cypher query');
      const result = await session.run(query, params);
      const records = result.records.map(record => record.toObject());
      logger.info('Cypher query executed successfully');
      return records;
    } catch (error) {
      logger.error({ error }, 'Error executing Cypher query');
      throw new Error(`Failed to execute Cypher query: ${error.message}`);
    } finally {
      await session.close();
    }
  }

  /**
   * Create a node in the graph
   * @param {string} label - Node label
   * @param {Object} properties - Node properties
   * @returns {Promise<Object>} - Created node
   */
  async createNode(label, properties) {
    if (!this.driver) {
      throw new Error('Neo4j connection not initialized');
    }
    
    const query = `CREATE (n:${label} $properties) RETURN n`;
    const params = { properties };
    const result = await this.executeQuery(query, params);
    return result[0].n;
  }

  /**
   * Create a relationship between nodes
   * @param {string} startNodeLabel - Start node label
   * @param {Object} startNodeProperties - Start node properties to match
   * @param {string} endNodeLabel - End node label
   * @param {Object} endNodeProperties - End node properties to match
   * @param {string} relationshipType - Relationship type
   * @param {Object} properties - Relationship properties
   * @returns {Promise<Object>} - Created relationship
   */
  async createRelationship(
    startNodeLabel,
    startNodeProperties,
    endNodeLabel,
    endNodeProperties,
    relationshipType,
    properties = {}
  ) {
    if (!this.driver) {
      throw new Error('Neo4j connection not initialized');
    }
    
    const query = `
      MATCH (a:${startNodeLabel} $startProps)
      MATCH (b:${endNodeLabel} $endProps)
      CREATE (a)-[r:${relationshipType} $properties]->(b)
      RETURN r
    `;
    const params = {
      startProps: startNodeProperties,
      endProps: endNodeProperties,
      properties
    };
    const result = await this.executeQuery(query, params);
    return result[0].r;
  }
}

module.exports = new Neo4jService();

module.exports = new Neo4jService();
const { spawn } = require('child_process');
const path = require('path');
const pino = require('pino');
const logger = pino();

class CogneeService {
  /**
   * Add text content to Cognee for processing
   * @param {string} text - The text content to add to Cognee
   * @returns {Promise<Object>} - Result of the operation
   */
  async addText(text) {
    try {
      logger.info('Adding text to Cognee');
      
      const pythonScript = path.join(__dirname, 'cognee', 'cognee.py');
      const pythonPath = process.env.PYTHON_PATH || 'python';
      
      const result = await this.executePythonScript(pythonScript, ['add', text]);
      
      logger.info('Text added to Cognee successfully');
      return { success: true, result: JSON.parse(result) };
    } catch (error) {
      logger.error({ error }, 'Error adding text to Cognee');
      throw new Error(`Failed to add text to Cognee: ${error.message}`);
    }
  }

  /**
   * Perform a search query using Cognee
   * @param {string} queryText - The search query text
   * @param {string} queryType - The type of search (GRAPH_COMPLETION, RAG_COMPLETION, SUMMARIES, CHUNKS)
   * @returns {Promise<Object>} - Search results
   */
  async search(queryText, queryType = 'GRAPH_COMPLETION') {
    try {
      logger.info('Performing search with Cognee');
      
      const pythonScript = path.join(__dirname, 'cognee', 'cognee.py');
      const pythonPath = process.env.PYTHON_PATH || 'python';
      
      const result = await this.executePythonScript(pythonScript, ['search', queryText, queryType]);
      
      logger.info('Search completed successfully');
      return { success: true, result: JSON.parse(result) };
    } catch (error) {
      logger.error({ error }, 'Error performing search with Cognee');
      throw new Error(`Failed to perform search with Cognee: ${error.message}`);
    }
  }

  /**
   * Execute a Python script and return the result
   * @param {string} scriptPath - Path to the Python script
   * @param {Array<string>} args - Arguments to pass to the script
   * @returns {Promise<string>} - Output from the Python script
   */
  async executePythonScript(scriptPath, args = []) {
    return new Promise((resolve, reject) => {
      const pythonPath = process.env.PYTHON_PATH || 'python';
      const pythonArgs = [scriptPath, ...args];
      
      logger.info({ scriptPath, args }, 'Executing Python script');
      
      const pythonProcess = spawn(pythonPath, pythonArgs, {
        cwd: path.dirname(scriptPath)
      });
      
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`Python script failed with code ${code}: ${stderr}`));
        }
      });
      
      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });
    });
  }
}

module.exports = new CogneeService();
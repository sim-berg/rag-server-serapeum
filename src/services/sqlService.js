const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class SQLService {
  constructor() {
    this.db = null;
  }

  /**
   * Initialize the database connection
   */
  async initializeConnection() {
    const dbPath = process.env.DATABASE_PATH || './documents.db';
    
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          resolve();
        }
      });
    });
  }

  /**
   * Create the necessary tables
   */
  async createTables() {
    const createDocumentsTableSQL = `
      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        author TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    const createProcessedPdfsTableSQL = `
      CREATE TABLE IF NOT EXISTS processed_pdfs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT UNIQUE,
        processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run(createDocumentsTableSQL, (err) => {
          if (err) {
            reject(err);
          } else {
            console.log('Documents table created or already exists');
          }
        });
        
        this.db.run(createProcessedPdfsTableSQL, (err) => {
          if (err) {
            reject(err);
          } else {
            console.log('Processed PDFs table created or already exists');
            resolve();
          }
        });
      });
    });
  }

  /**
   * Store a document name and author
   * @param {string} documentName - The name of the document
   * @param {string} author - The author of the document
   */
  async storeDocument(documentName, author) {
    const insertSQL = `
      INSERT INTO documents (name, author)
      VALUES (?, ?)
    `;

    return new Promise((resolve, reject) => {
      this.db.run(insertSQL, [documentName, author], function(err) {
        if (err) {
          reject(err);
        } else {
          console.log(`Document stored with ID: ${this.lastID}`);
          resolve(this.lastID);
        }
      });
    });
  }

  /**
   * Retrieve all documents with authors
   * @returns {Promise<Array>} - Array of documents with their authors
   */
  async getDocuments() {
    const selectSQL = `
      SELECT id, name, author, created_at
      FROM documents
      ORDER BY created_at DESC
    `;

    return new Promise((resolve, reject) => {
      this.db.all(selectSQL, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Check if a PDF has already been processed
   * @param {string} filename - The name of the PDF file
   * @returns {Promise<boolean>} - True if the PDF has been processed, false otherwise
   */
  async isDocumentProcessed(filename) {
    const selectSQL = `
      SELECT COUNT(*) as count
      FROM processed_pdfs
      WHERE filename = ?
    `;

    return new Promise((resolve, reject) => {
      this.db.get(selectSQL, [filename], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.count > 0);
        }
      });
    });
  }

  /**
   * Mark a PDF as processed
   * @param {string} filename - The name of the PDF file
   */
  async markDocumentAsProcessed(filename) {
    const insertSQL = `
      INSERT OR IGNORE INTO processed_pdfs (filename)
      VALUES (?)
    `;

    return new Promise((resolve, reject) => {
      this.db.run(insertSQL, [filename], function(err) {
        if (err) {
          reject(err);
        } else {
          console.log(`PDF marked as processed: ${filename}`);
          resolve(this.lastID);
        }
      });
    });
  }

  /**
   * Close the database connection
   */
  async closeConnection() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('Database connection closed');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

// Export a singleton instance
module.exports = new SQLService();
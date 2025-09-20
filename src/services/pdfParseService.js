const pdfParse = require('pdf-parse');
const fs = require('fs').promises;
const path = require('path');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters'); 
const { v4: uuidv4 } = require('uuid');
const sqlService = require('./sqlService');
const qdrantService = require('./qdrantService');
const lmstudioService = require('./lmstudioService');
const ollamaService = require('./ollamaService');

class PDFParseService {
  constructor() {
    // Context window size for Qwen3-Embedding-4B-GGUF/Qwen3-Embedding-4B-Q6_K
    this.contextWindowSize = 512;
  }

  async parseAndProcessPDFs(inputDirectory) {
    try {
      // Get all PDF files in the input directory
      const files = await fs.readdir(inputDirectory);
      const pdfFiles = files.filter(file => path.extname(file).toLowerCase() === '.pdf');

      for (const pdfFile of pdfFiles) {
        const filePath = path.join(inputDirectory, pdfFile);
        const fileName = path.basename(pdfFile, '.pdf');

        // Check if the document has already been processed
        const isProcessed = await sqlService.isDocumentProcessed(fileName);
        if (isProcessed) {
          console.log(`PDF ${pdfFile} has already been processed. Skipping.`);
          continue;
        }

        // Parse the PDF
        const pdfData = await this.parsePDF(filePath);
        let content = pdfData.text;

        // Split content if it exceeds the context window
        if (content.length > this.contextWindowSize) {
          content = await this.splitContent(content);
        }

        // Process the content (generate embeddings and store in databases)
        await this.processContent(content, fileName);

        // Mark the document as processed in SQL database
        await sqlService.markDocumentAsProcessed(fileName);
        console.log(`Successfully processed PDF`);
      }
    } catch (error) {
      console.error('Error processing PDFs:', error);
      throw error;
    }
  }

  async parsePDF(filePath) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer);
      return data;
    } catch (error) {
      console.error(`Error parsing PDF ${filePath}:`, error);
      throw error;
    }
  }

  async splitContent(content) {
    try {
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: this.contextWindowSize,
        chunkOverlap: 100,
      });

      const docs = await textSplitter.createDocuments([content]);
      return docs.map(doc => doc.pageContent).join('\n\n');
    } catch (error) {
      console.error('Error splitting content:', error);
      throw error;
    }
  }

  async processContent(content, fileName) {
    try {
      // Generate embeddings
      let embeddings;
      try {
        embeddings = await lmstudioService.generateEmbeddings(content);
      } catch (lmStudioError) {
        console.warn('LM Studio failed, falling back to Ollama for embeddings');
        embeddings = await ollamaService.generateEmbeddings(content);
      }

      // Store in Qdrant with a proper UUID
      const documentId = uuidv4();
      await qdrantService.storeDocument(documentId, embeddings, { title: fileName }, content);

      console.log(`Successfully processed content for: ${fileName}`);
    } catch (error) {
      console.error(`Error processing content for ${fileName}:`, error);
      throw error;
    }
  }
}

module.exports = new PDFParseService();


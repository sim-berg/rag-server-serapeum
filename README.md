# RAG Server

A custom REST API server for Retrieval-Augmented Generation (RAG) applications built with Express.js, Ollama, Qdrant, Neo4j, and Cognee.

## Features

- Query endpoint for RAG operations using Ollama and Qdrant
- Document management API with storage in Qdrant
- Graph database integration with Neo4j
- Knowledge graph processing with Cognee
- Health check endpoint
- Prompt generation endpoints
- JSON request parsing
- Security middleware (CORS, Helmet)
- Request logging with Morgan
- Structured application logging with Pino

## Architecture

The RAG server integrates five key components:

1. **Ollama**: For generating embeddings and LLM responses
2. **Qdrant**: For vector storage and similarity search
3. **Neo4j**: For graph database storage and relationship management
4. **Cognee**: For knowledge graph processing and reasoning
5. **Express.js**: For HTTP API handling

## Prerequisites

- Node.js v18 or higher
- Python 3.8 or higher
- Ollama service running locally
- Qdrant service running locally (or Qdrant cloud account)
- Neo4j service running locally

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file in the project root with your configuration:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Ollama Configuration
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.1

# Qdrant Configuration
QDRANT_HOST=http://127.0.0.1:6333
QDRANT_COLLECTION_NAME=rag-server-collection
QDRANT_API_KEY=your_qdrant_api_key_here  # Optional, only needed for cloud Qdrant

# Neo4j Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_neo4j_password

# Python Path (optional, if not in PATH)
PYTHON_PATH=python
```

## Usage

```bash
# Production
npm start

# Development with auto-reload
npm run dev
```

## API Endpoints

### Health Check
`GET /health` - Server health check

### RAG Query
`POST /api/v1/query` - Submit a query for RAG processing

Request body:
```json
{
  "query": "Your question here",
  "context": "Optional context"
}
```

### Store Document
`POST /api/v1/documents` - Store a document for RAG context

Request body:
```json
{
  "content": "Document content here",
  "metadata": {
    "title": "Sample Document",
    "author": "Author Name"
  }
}
```

### Retrieve Document
`GET /api/v1/documents/:id` - Retrieve a document by ID

### Retrieve Graph Nodes
`GET /api/v1/graph/:label` - Retrieve nodes from the graph database by label

Request parameters:
- `label` - The node label to retrieve
- `limit` (optional) - Maximum number of nodes to return (default: 10)

### Add Content to Cognee
`POST /api/v1/cognee/add` - Add content to Cognee for knowledge graph processing

Request body:
```json
{
  "content": "Content to be processed by Cognee"
}
```

### Search with Cognee
`POST /api/v1/cognee/search` - Perform a search query using Cognee

Request body:
```json
{
  "query": "Your search query",
  "type": "GRAPH_COMPLETION"  // Can be GRAPH_COMPLETION, RAG_COMPLETION, SUMMARIES, or CHUNKS
}
```

## Example Usage

### Health Check
```bash
curl http://localhost:3000/health
```

### Query Endpoint
```bash
curl -X POST http://localhost:3000/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the capital of France?"}'
```

### Store Document
```bash
curl -X POST http://localhost:3000/api/v1/documents \
  -H "Content-Type: application/json" \
  -d '{"content": "This is document content", "metadata": {"title": "Sample Document"}}'
```

### Retrieve Document
```bash
curl http://localhost:3000/api/v1/documents/12345
```

### Retrieve Graph Nodes
```bash
curl http://localhost:3000/api/v1/graph/Document
```

### Add Content to Cognee
```bash
curl -X POST http://localhost:3000/api/v1/cognee/add \
  -H "Content-Type: application/json" \
  -d '{"content": "Python is a programming language used for data analysis, web development, and machine learning."}'
```

### Search with Cognee
```bash
curl -X POST http://localhost:3000/api/v1/cognee/search \
  -H "Content-Type: application/json" \
  -d '{"query": "What is Python?", "type": "GRAPH_COMPLETION"}'
```

## Testing

Run the test suite with:
```bash
npm test
```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions for NixOS.

## Directory Structure
```
rag-server/
├── src/
│   ├── index.js              # Main server implementation
│   ├── services/
│   │   ├── ollamaService.js  # Ollama client wrapper
│   │   ├── qdrantService.js  # Qdrant client wrapper
│   │   ├── neo4jService.js   # Neo4j client wrapper
│   │   └── cogneeService.js  # Cognee client wrapper
│   └── cognee/
│       ├── cognee.py         # Cognee Python script
│       ├── .data_storage/    # Cognee data storage directory
│       └── .cognee_system/   # Cognee system directory
├── nixos/
│   └── rag-server.nix        # NixOS service configuration
├── test.js                   # Test suite
├── package.json              # Project dependencies and scripts
├── .env.example              # Example environment configuration
└── README.md                 # This file
```

## License

MIT
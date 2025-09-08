# RAG Server

A custom REST API server for Retrieval-Augmented Generation (RAG) applications built with Express.js, Ollama, and Qdrant.

## Features

- Query endpoint for RAG operations using Ollama and Qdrant
- Document management API with storage in Qdrant
- Health check endpoint
- Prompt generation endpoints
- JSON request parsing
- Security middleware (CORS, Helmet)
- Request logging with Morgan
- Structured application logging with Pino

## Architecture

The RAG server integrates three key components:

1. **Ollama**: For generating embeddings and LLM responses
2. **Qdrant**: For vector storage and similarity search
3. **Express.js**: For HTTP API handling

## Prerequisites

- Node.js v18 or higher
- Ollama service running locally
- Qdrant service running locally (or Qdrant cloud account)

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

### Get Available Prompts
`GET /api/v1/prompts` - Get all available prompt types

### Generate a Prompt
`POST /api/v1/prompt` - Generate a prompt based on predefined templates

Request body:
```json
{
  "promptType": "technical",
  "query": "Explain how RAG works"
}
```

## Example Queries

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
│   ├── index.js          # Main server implementation
│   └── services/
│       ├── ollamaService.js    # Ollama client wrapper
│       └── qdrantService.js  # Qdrant client wrapper
├── nixos/
│   └── rag-server.nix    # NixOS service configuration
├── test.js               # Test suite
├── package.json          # Project dependencies and scripts
├── .env.example          # Example environment configuration
└── README.md             # This file
```

## License

MIT
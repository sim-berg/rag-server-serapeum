# Deployment Guide for RAG Server

## NixOS Deployment

The RAG server is designed to run as a systemd service on NixOS. The service configuration is defined in `nixos/rag-server.nix`.

### Service Configuration

The systemd service configuration includes:
- Automatic startup after network is available
- Automatic restart on failure
- Dedicated `rag` user for security
- Environment variables for configuration

### Required Dependencies

For full functionality, you'll need to ensure these services are available:

1. **Ollama Service**:
   - Must be running locally for embeddings and LLM queries
   - Default endpoint: `http://127.0.0.1:11434`
   - Required model: `llama3.1` (can be configured)

2. **Qdrant Service**:
   - Must be running locally or accessible via network
   - Default endpoint: `http://127.0.0.1:6333`
   - No API key required for local deployment
   - Service creates collections automatically

3. **Neo4j Service**:
   - Must be running locally or accessible via network
   - Default endpoint: `bolt://localhost:7687`
   - Default username: `neo4j`
   - Password should be configured securely

4. **Python**:
   - Required for Cognee integration
   - Version 3.8 or higher
   - Available through NixOS package management

### Installation Steps

1. Copy the rag-server directory to your NixOS machine
2. Add the nixos/rag-server.nix module to your NixOS configuration
3. Set the environment variables in your NixOS configuration:
   ```
   environment.systemPackages = [
     (pkgs.writeTextFile {
       name = "rag-server-config";
       text = ''
         NODE_ENV=production
         PORT=3000
         OLLAMA_HOST=http://127.0.0.1:11434
         OLLAMA_MODEL=llama3.1
         QDRANT_HOST=http://127.0.0.1:6333
         QDRANT_COLLECTION_NAME=rag-server-collection
         NEO4J_URI=bolt://localhost:7687
         NEO4J_USERNAME=neo4j
         NEO4J_PASSWORD=your_secure_password
         PYTHON_PATH=/path/to/python
       '';
       destination = "/var/lib/rag-server/.env";
     })
   ];
   ```
4. Rebuild your NixOS configuration
5. Start the service with `systemctl start rag-server`

### Environment Variables

The following environment variables can be configured in the NixOS service definition:

- `NODE_ENV` - Node environment (production/development)
- `PORT` - Port for the server (default: 3000)
- `OLLAMA_HOST` - Ollama service endpoint
- `OLLAMA_MODEL` - Model to use for embeddings and generation
- `QDRANT_HOST` - Qdrant service endpoint
- `QDRANT_COLLECTION_NAME` - Name of the Qdrant collection to use
- `QDRANT_API_KEY` - Qdrant API key (optional, for cloud Qdrant)
- `NEO4J_URI` - Neo4j service endpoint
- `NEO4J_USERNAME` - Neo4j username
- `NEO4J_PASSWORD` - Neo4j password
- `PYTHON_PATH` - Path to Python executable (required for Cognee)

### Directory Permissions

The service runs as the `rag` user and expects to use `/var/lib/rag-server` as its working directory. Ensure this directory exists and is writable by the `rag` user.

### Troubleshooting

- Check service status: `systemctl status rag-server`
- Check logs: `journalctl -u rag-server`
- Ensure Ollama is running and accessible
- Verify Qdrant service is running and accessible
- Verify Neo4j service is running and accessible
- Ensure Python is installed and accessible
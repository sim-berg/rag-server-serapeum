const { spawn } = require('child_process');
const path = require('path');

// Test configuration
const PORT = process.env.PORT || 3001; // Use different port for testing
const TIMEOUT = 10000; // 10 seconds

console.log('Starting RAG Server tests...');

// Set environment variables for testing
process.env.PORT = PORT;
process.env.NODE_ENV = 'test';

// Function to wait for a specific time
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function to test health endpoint
async function testHealthEndpoint() {
  try {
    const response = await fetch(`http://localhost:${PORT}/health`);
    const data = await response.json();
    
    if (response.ok && data.status === 'OK') {
      console.log('✓ Health endpoint test passed');
      return true;
    } else {
      console.log('✗ Health endpoint test failed');
      return false;
    }
  } catch (error) {
    console.log('✗ Health endpoint test failed:', error.message);
    return false;
  }
}

// Function to test document endpoints
async function testDocumentEndpoints() {
  try {
    // Test document creation
    const createResponse = await fetch(`http://localhost:${PORT}/api/v1/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'This is a test document',
        metadata: { title: 'Test Document' }
      })
    });
    
    const createData = await createResponse.json();
    
    if (!createResponse.ok) {
      console.log('✗ Document creation test failed');
      return false;
    }
    
    const documentId = createData.document.id;
    console.log('✓ Document creation test passed');
    
    // Test document retrieval
    const getResponse = await fetch(`http://localhost:${PORT}/api/v1/documents/${documentId}`);
    const getData = await getResponse.json();
    
    if (getResponse.ok && getData.id === documentId) {
      console.log('✓ Document retrieval test passed');
      return true;
    } else {
      console.log('✗ Document retrieval test failed');
      return false;
    }
  } catch (error) {
    console.log('✗ Document endpoints test failed:', error.message);
    return false;
  }
}

// Function to test prompt endpoints
async function testPromptEndpoints() {
  try {
    // Test prompt generation
    const promptResponse = await fetch(`http://localhost:${PORT}/api/v1/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        promptType: 'technical',
        query: 'What is RAG?'
      })
    });
    
    const promptData = await promptResponse.json();
    
    if (promptResponse.ok && promptData.promptType === 'technical') {
      console.log('✓ Prompt generation test passed');
      return true;
    } else {
      console.log('✗ Prompt generation test failed');
      return false;
    }
  } catch (error) {
    console.log('✗ Prompt endpoints test failed:', error.message);
    return false;
  }
}

// Main test function
async function runTests() {
  // Start the server
  const serverPath = path.join(__dirname, 'src', 'index.js');
  const server = spawn('node', [serverPath], {
    env: { ...process.env, PORT: PORT },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let serverOutput = '';
  server.stdout.on('data', (data) => {
    serverOutput += data.toString();
  });

  server.stderr.on('data', (data) => {
    console.error('Server error:', data.toString());
  });

  // Wait for server to start
  let serverStarted = false;
  const startTime = Date.now();
  
  while (!serverStarted && Date.now() - startTime < TIMEOUT) {
    try {
      const response = await fetch(`http://localhost:${PORT}/health`, { timeout: 1000 });
      if (response.ok) {
        serverStarted = true;
      }
    } catch (error) {
      // Server not ready yet, wait and try again
      await wait(1000);
    }
  }

  if (!serverStarted) {
    console.log('✗ Server failed to start within timeout period');
    server.kill();
    process.exit(1);
  }

  console.log('✓ Server started successfully');
  
  // Run tests
  const tests = [
    testHealthEndpoint,
    testDocumentEndpoints,
    testPromptEndpoints
  ];

  let passedTests = 0;
  for (const test of tests) {
    const result = await test();
    if (result) passedTests++;
  }

  // Stop the server
  server.kill();

  console.log(`\n${passedTests}/${tests.length} tests passed`);
  
  if (passedTests === tests.length) {
    console.log('All tests passed! ✅');
    process.exit(0);
  } else {
    console.log('Some tests failed! ❌');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
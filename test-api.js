// Test script for RAG server endpoints
const http = require('http');

const hostname = 'localhost';
const port = 3000;

// Test data
const testQuery = {
  query: "What is the capital of France?",
  context: "Geography questions"
};

const testDocument = {
  content: "This is a sample document for testing the RAG server.",
  metadata: {
    title: "Test Document",
    author: "Test User"
  }
};

// Function to make HTTP requests
function makeRequest(path, method, data, callback) {
  const options = {
    hostname: hostname,
    port: port,
    path: path,
    method: method,
    headers: {
      'Content-Type': 'application/json',
    }
  };

  const req = http.request(options, (res) => {
    let responseData = '';
    
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      console.log(`${method} ${path} - Status: ${res.statusCode}`);
      try {
        const jsonData = JSON.parse(responseData);
        console.log('Response:', jsonData);
      } catch (e) {
        console.log('Response:', responseData);
      }
      console.log('---');
      if (callback) callback();
    });
  });

  req.on('error', (error) => {
    console.error(`Error with ${method} ${path}:`, error.message);
  });

  if (data) {
    req.write(JSON.stringify(data));
  }
  
  req.end();
}

// Test sequence
console.log('Testing RAG Server endpoints...\n');

makeRequest('/health', 'GET', null, () => {
  makeRequest('/api/v1/query', 'POST', testQuery, () => {
    makeRequest('/api/v1/documents', 'POST', testDocument, () => {
      console.log('All tests completed!');
    });
  });
});
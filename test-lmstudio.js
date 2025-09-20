const lmstudioService = require('./src/services/lmstudioService');

async function testLMStudioService() {
  try {
    console.log('Testing LM Studio service...');
    
    // Test embeddings generation
    console.log('Generating embeddings...');
    const embeddings = await lmstudioService.generateEmbeddings('Hello, world!');
    console.log(`Embeddings generated successfully. Length: ${embeddings.length}`);
    
    // Test response generation
    console.log('Generating response...');
    const response = await lmstudioService.generateResponse('What is the capital of France?');
    console.log(`Response generated: ${response}`);
    
    console.log('LM Studio service test completed successfully!');
  } catch (error) {
    console.error('LM Studio service test failed:', error.message);
  }
}

testLMStudioService();
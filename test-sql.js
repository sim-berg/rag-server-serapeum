const sqlService = require('./src/services/sqlService');

// Mock data for testing
const mockDocuments = [
  { name: 'Introduction to Machine Learning', author: 'Andrew Ng' },
  { name: 'The Art of Computer Programming', author: 'Donald Knuth' },
  { name: 'Clean Code', author: 'Robert Martin' }
];

async function testSQLService() {
  try {
    // Initialize the service
    console.log('Initializing SQL service...');
    await sqlService.initializeConnection();
    await sqlService.createTables();
    
    // Store mock documents
    console.log('Storing mock documents...');
    for (const doc of mockDocuments) {
      const id = await sqlService.storeDocument(doc.name, doc.author);
      console.log(`Stored document: ${doc.name} by ${doc.author} with ID: ${id}`);
    }
    
    // Retrieve all documents
    console.log('Retrieving all documents...');
    const documents = await sqlService.getDocuments();
    console.log('Retrieved documents:');
    documents.forEach(doc => {
      console.log(`- ${doc.name} by ${doc.author} (ID: ${doc.id}, Created: ${doc.created_at})`);
    });
    
    // Close connection
    console.log('Closing connection...');
    await sqlService.closeConnection();
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testSQLService();
const axios = require('axios');

async function debug() {
  console.log('🔍 Debugging API endpoints...\n');
  
  try {
    // Test 1: API Info
    console.log('1. Testing /api endpoint:');
    try {
      const response = await axios.get('http://localhost:3001/api');
      console.log('   Status:', response.status);
      console.log('   Data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('   Error:', error.response?.status, error.response?.statusText);
      console.log('   Data:', error.response?.data);
    }

    // Test 2: Document Creation
    console.log('\n2. Testing document creation:');
    try {
      const response = await axios.post('http://localhost:3001/api/documents', {
        title: 'Debug Test Document'
      });
      console.log('   Status:', response.status);
      console.log('   Data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('   Error:', error.response?.status, error.response?.statusText);
      console.log('   Data:', JSON.stringify(error.response?.data, null, 2));
    }

  } catch (error) {
    console.error('Debug failed:', error.message);
  }
}

debug();
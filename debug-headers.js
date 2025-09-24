#!/usr/bin/env node

const axios = require('axios');

function randomUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const baseURL = 'https://template-api-whba.dev.connected-web.services';
const uuid = randomUUID();

// Test different header combinations
const testCases = [
  {
    name: 'Only required headers from config',
    headers: {
      'User-Agent': 'github.com/connected-web/template-api post-deployment-tests/1.0',
      'X-Website-Authcode': uuid
    }
  },
  {
    name: 'With Content-Type and Accept',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json', 
      'User-Agent': 'github.com/connected-web/template-api post-deployment-tests/1.0',
      'X-Website-Authcode': uuid
    }
  },
  {
    name: 'With all headers but lowercase',
    headers: {
      'content-type': 'application/json',
      'accept': 'application/json',
      'user-agent': 'github.com/connected-web/template-api post-deployment-tests/1.0',
      'x-website-authcode': uuid
    }
  }
];

async function testHeaders(testCase) {
  try {
    console.log(`\n=== Testing: ${testCase.name} ===`);
    console.log('Headers:', JSON.stringify(testCase.headers, null, 2));
    
    const response = await axios.get(`${baseURL}/status`, {
      headers: testCase.headers,
      validateStatus: () => true // Don't throw on non-2xx responses
    });
    
    console.log(`Response: ${response.status} ${response.statusText}`);
    console.log('Response headers:', response.headers);
    console.log('Response body:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log(`Error: ${error.message}`);
    if (error.response) {
      console.log(`Response: ${error.response.status} ${error.response.statusText}`);
      console.log('Response body:', error.response.data);
    }
  }
}

async function main() {
  console.log('Testing header-based authentication with UUID:', uuid);
  
  for (const testCase of testCases) {
    await testHeaders(testCase);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay between requests
  }
}

main().catch(console.error);
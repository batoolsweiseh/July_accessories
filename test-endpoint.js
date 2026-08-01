const fetch = require('node-fetch'); // or native fetch if node 18+

async function test() {
  try {
    const res = await fetch('http://localhost:3001/api/v1/artworks');
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Body size:', Buffer.byteLength(text, 'utf8'));
    console.log('Response:', text);
  } catch (e) {
    console.error('Fetch error:', e);
  }
}

test();

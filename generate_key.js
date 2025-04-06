const crypto = require('crypto');
const fs = require('fs');

// Generate a new private key
const key = crypto.randomBytes(16).toString('base64');

// Read the current manifest.json
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));

// Add the key to the manifest
manifest.key = key;

// Write the updated manifest back to file
fs.writeFileSync('manifest.json', JSON.stringify(manifest, null, 2)); 

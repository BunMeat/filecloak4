// Import necessary modules
require('dotenv').config();
var express = require('express');
var CryptoJS = require('crypto-js');
var router = express.Router();

// // Encrypt function for notes
function encrypt(text, key, IV) {
  // Parse the key and IV from hexadecimal strings
  const encryptKey = CryptoJS.enc.Hex.parse(key);
  const encryptIV = CryptoJS.enc.Hex.parse(IV);

  // Encrypt the text
  const encrypted = CryptoJS.AES.encrypt(text, encryptKey, { iv: encryptIV }).toString();

  // Return the encrypted text (ciphertext only) and IV as a colon-separated string
  return encrypted
}


// Handle note encryption
router.post('/', async (req, res) => {
  const { text, key, iv } = req.body;

  if (!text || !key) {
    return res.status(400).json({ error: 'Text and key are required' });
  }

  try {
    const encryptedText = encrypt(text, key, iv);
    res.status(200).json({ encryptedText });
  } catch (error) {
    console.error('Encryption failed', error);
    res.status(500).json({ error: 'Encryption failed' });
  }
});
module.exports = router;
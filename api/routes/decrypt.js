require('dotenv').config();
var express = require('express');
var CryptoJS = require('crypto-js');
var router = express.Router();

  function decrypt(encryptedText, key) {
    // Split the ciphertext and IV
    const [ciphertext, ivHex] = encryptedText.split(':');
    if (!ciphertext || !ivHex) {
      throw new Error('Invalid encrypted text format');
    }
  
    // Parse the key and IV from hexadecimal strings
    const decryptKey = CryptoJS.enc.Hex.parse(key);
    const decryptIV = CryptoJS.enc.Hex.parse(ivHex);
  
    // Decrypt the text
    const decrypted = CryptoJS.AES.decrypt(ciphertext, decryptKey, { iv: decryptIV });
  
    // Convert decrypted content to a UTF-8 string
    return decrypted.toString(CryptoJS.enc.Utf8);
  }
  

// Route for decryption
router.post('/', async (req, res) => {
  const { encryptedText, key } = req.body;

  if (!encryptedText || !key) {
    return res.status(400).json({ error: 'Encrypted text and key are required' });
  }

  try {
    const decryptedText = decrypt(encryptedText, key);
    res.status(200).json({ decryptedText });
  } catch (error) {
    console.error('Decryption failed', error);
    res.status(500).json({ error: 'Decryption failed' });
  }
});


module.exports = router;

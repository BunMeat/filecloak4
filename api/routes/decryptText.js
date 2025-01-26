require('dotenv').config();
var express = require('express');
var CryptoJS = require('crypto-js');
var router = express.Router();

// Decrypt function
function decrypt(encryptedText, key) {
  const [ciphertext, ivBase64] = encryptedText.split(':'); // Split ciphertext and IV
  if (!ciphertext || !ivBase64) {
    throw new Error('Invalid encrypted text format');
  }

  const decryptKey = CryptoJS.enc.Utf8.parse(key);
  const decryptIV = CryptoJS.enc.Base64.parse(ivBase64); // Parse Base64 IV

  const decrypted = CryptoJS.AES.decrypt(ciphertext, decryptKey, { iv: decryptIV });
  return decrypted.toString(CryptoJS.enc.Utf8); // Convert decrypted content to UTF-8 string
}


// Route to handle text decryption
router.post('/', async (req, res) => {
  const { encryptedText, key } = req.body;
  console.log("req.body: ", req.body)

  if (!encryptedText || !key) {
    return res.status(400).json({ error: 'Encrypted text and key are required' });
  }

  try {
    const decryptedText = decrypt(encryptedText, key);
    console.log("decryptedText: ", decryptedText)
    res.status(200).json({ decryptedText });
  } catch (error) {
    console.error('Decryption failed', error);
    res.status(500).json({ error: 'Decryption failed' });
  }
});

module.exports = router;

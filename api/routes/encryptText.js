require('dotenv').config();
var express = require('express');
var CryptoJS = require('crypto-js');
var router = express.Router();

// Encrypt function
function encrypt(text, key) {
  const encryptKey = CryptoJS.enc.Utf8.parse(key);
  const encryptIV = CryptoJS.lib.WordArray.random(16);
  const encrypted = CryptoJS.AES.encrypt(text, encryptKey, { iv: encryptIV }).toString();
  return encrypted + ':' + encryptIV.toString(CryptoJS.enc.Base64);
}

// Route to handle text encryption
router.post('/', async (req, res) => {
  const { text, key } = req.body;

  if (!text || !key) {
    return res.status(400).json({ error: 'Text and key are required' });
  }

  try {
    const encryptedText = encrypt(text, key);
    res.send("encryptText is active");
    res.status(200).json({ encryptedText });
  } catch (error) {
    console.error('Encryption failed', error);
    res.status(500).json({ error: 'Encryption failed' });
  }
});

module.exports = router;
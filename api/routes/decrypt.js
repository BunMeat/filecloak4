require('dotenv').config();
var express = require('express');
var CryptoJS = require('crypto-js');
var router = express.Router();

// AES Decrypt function


  // 20250101_000309(0) (39).jpg-kcicct.enc file name
  // 5d119497f7d54b1abe3e97bdc05e29ae57031d92fb20d03303a252042bf405cb key
  // Ort4OxWyfMpiP8YZPpZW2w==:69d099399319801439351af1b724ca56 encryptedText
  // hahaha expected result

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
  console.log("encryptedText: ", encryptedText);
  console.log("key: ", key)

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

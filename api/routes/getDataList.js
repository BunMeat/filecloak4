const express = require('express');
const router = express.Router();
const { getFirestore, collection, doc, getDocs } = require('firebase/firestore');

// Initialize Firestore
const firestore = getFirestore();

// Route to get all user data
router.get('/', async (req, res) => {
  try {
    const usersCollection = collection(firestore, "users");
    const usersSnapshot = await getDocs(usersCollection);
    const data = [];

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const filesCollection = collection(firestore, `users/${userDoc.id}/files`);
      const filesSnapshot = await getDocs(filesCollection);

      if (filesSnapshot.empty) {
        data.push({
          email: userData.email,
          files: []
        });
      } else {
        const userFiles = [];
        filesSnapshot.forEach(fileDoc => {
          const fileData = fileDoc.data();
          userFiles.push(fileData);
        });
        data.push({
          email: userData.email,
          files: userFiles
        });
      }
    }
    res.send("getData is active");
    res.json(data);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Error fetching data");
  }
});

module.exports = router;

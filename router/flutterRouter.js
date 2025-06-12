const express = require('express');
const authController = require('../controllers/authController');
const flutterController = require('../controllers/flutterController');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authController.authenticateToken);

// Create downloads directory if it doesn't exist
const downloadsDir = path.join(__dirname, '../downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

// Generate and download Flutter project as zip
router.get('/:roomId/export-flutter', flutterController.exportFlutterProject);

module.exports = router;
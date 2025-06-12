const express = require('express');
const roomController = require('../controllers/roomController');
const authController = require('../controllers/authController');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authController.authenticateToken);

// Create a new room
router.post('/', roomController.createRoom);

// Get user's rooms
router.get('/', roomController.getUserRooms);

// Get room invite code (only for owner)
router.get('/:roomId/invite-code', roomController.getRoomInviteCode);

// Join a room with invite code
router.post('/join', roomController.joinRoomWithInviteCode);

module.exports = router;
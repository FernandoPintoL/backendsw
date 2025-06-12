const roomModel = require('../models/roomModel');
const whiteboardModel = require('../models/whiteboardModel');

// Room controller
const roomController = {
  // Create a new room
  async createRoom(req, res) {
    try {
      const { name } = req.body;
      const userId = req.user.id;

      // Create room
      const newRoom = await roomModel.createRoom(name, userId);

      // Add owner as a member
      await roomModel.addMember(newRoom.id, userId);

      // Initialize empty whiteboard data
      await whiteboardModel.initializeWhiteboard(newRoom.id);

      res.status(201).json({
        message: 'Room created successfully',
        room: newRoom
      });
    } catch (error) {
      console.error('Error creating room', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Get user's rooms
  async getUserRooms(req, res) {
    try {
      const userId = req.user.id;
      const rooms = await roomModel.getUserRooms(userId);
      
      res.json(rooms);
    } catch (error) {
      console.error('Error fetching rooms', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Get room invite code (only for owner)
  async getRoomInviteCode(req, res) {
    try {
      const { roomId } = req.params;
      const userId = req.user.id;

      // Get room details
      const room = await roomModel.findRoomById(roomId);
      
      if (!room) {
        return res.status(404).json({ message: 'Sala no encontrada' });
      }

      // Check if user is the owner
      if (room.owner_id !== userId) {
        return res.status(403).json({ message: 'Acceso denegado' });
      }

      // Get invite code
      const inviteCode = room.invite_code;
      
      res.json({ inviteCode });
    } catch (error) {
      console.error('Error obteniendo invite code', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Join a room with invite code
  async joinRoomWithInviteCode(req, res) {
    try {
      const { inviteCode } = req.body;
      const userId = req.user.id;

      // Find room by invite code
      const room = await roomModel.findRoomByInviteCode(inviteCode);
      
      if (!room) {
        return res.status(404).json({ message: 'Room not found' });
      }

      // Check if user is already a member
      const isMember = await roomModel.isMember(room.id, userId);
      
      if (isMember) {
        return res.status(400).json({ message: 'Already a member of this room' });
      }

      // Add user to room
      await roomModel.addMember(room.id, userId);

      res.json({
        message: 'Joined room successfully',
        room: {
          id: room.id,
          name: room.name,
          owner_id: room.owner_id,
          created_at: room.created_at
        }
      });
    } catch (error) {
      console.error('Error joining room', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = roomController;
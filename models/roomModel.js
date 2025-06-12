const { pool } = require('./db');

// Room model functions
const roomModel = {
  // Create a new room
  async createRoom(name, ownerId) {
    // Generate a unique invite code
    const inviteCode = Math.random().toString(36).substring(2, 10);
    
    const result = await pool.query(
      'INSERT INTO rooms (name, owner_id, invite_code) VALUES ($1, $2, $3) RETURNING *',
      [name, ownerId, inviteCode]
    );
    
    return result.rows[0];
  },
  
  // Add a member to a room
  async addMember(roomId, userId) {
    const result = await pool.query(
      'INSERT INTO room_members (room_id, user_id) VALUES ($1, $2) RETURNING *',
      [roomId, userId]
    );
    
    return result.rows[0];
  },
  
  // Find room by ID
  async findRoomById(roomId) {
    const result = await pool.query(
      'SELECT * FROM rooms WHERE id = $1',
      [roomId]
    );
    
    return result.rows[0];
  },
  
  // Find room by invite code
  async findRoomByInviteCode(inviteCode) {
    const result = await pool.query(
      'SELECT * FROM rooms WHERE invite_code = $1',
      [inviteCode]
    );
    
    return result.rows[0];
  },
  
  // Check if user is a member of a room
  async isMember(roomId, userId) {
    const result = await pool.query(
      'SELECT * FROM room_members WHERE room_id = $1 AND user_id = $2',
      [roomId, userId]
    );
    
    return result.rows.length > 0;
  },
  
  // Get all rooms for a user
  async getUserRooms(userId) {
    const result = await pool.query(
      `SELECT
        r.id,
        r.name,
        r.owner_id,
        r.created_at
      FROM rooms r
      JOIN room_members rm ON r.id = rm.room_id
      WHERE rm.user_id = $1`,
      [userId]
    );
    
    return result.rows;
  },
  
  // Get invite code for a room
  async getInviteCode(roomId) {
    const result = await pool.query(
      'SELECT invite_code FROM rooms WHERE id = $1',
      [roomId]
    );
    
    return result.rows[0]?.invite_code;
  }
};

module.exports = roomModel;
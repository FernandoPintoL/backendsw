const { pool } = require('./db');
const bcrypt = require('bcrypt');

// User model functions
const userModel = {
  // Create a new user
  async createUser(username, email, password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, hashedPassword]
    );
    
    return result.rows[0];
  },
  
  // Find user by email
  async findUserByEmail(email) {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    return result.rows[0];
  },
  
  // Find user by username or email
  async findUserByUsernameOrEmail(username, email) {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );
    
    return result.rows[0];
  },
  
  // Find user by ID
  async findUserById(id) {
    const result = await pool.query(
      'SELECT id, username, email, created_at FROM users WHERE id = $1',
      [id]
    );
    
    return result.rows[0];
  },
  
  // Verify password
  async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
};

module.exports = userModel;
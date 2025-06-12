const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'primer_parcial',
  password: '7803',
  port: 5432,
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to the database', err);
  } else {
    console.log('Database connected successfully');
    // Create tables if they don't exist
    createTables();
  }
});

// Create necessary tables
async function createTables() {
  try {
    // First check if tables exist to avoid sequence creation issues
    const tablesExist = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);

    if (!tablesExist.rows[0].exists) {
      // Users table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(100) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Rooms table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS rooms (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          owner_id INTEGER REFERENCES users(id),
          invite_code VARCHAR(20) UNIQUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Room members table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS room_members (
          id SERIAL PRIMARY KEY,
          room_id INTEGER REFERENCES rooms(id),
          user_id INTEGER REFERENCES users(id),
          joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(room_id, user_id)
        )
      `);

      // Whiteboard data table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS whiteboard_data (
          id SERIAL PRIMARY KEY,
          room_id INTEGER REFERENCES rooms(id),
          data JSONB NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      console.log('Tables created successfully');
    } else {
      console.log('Tables already exist, skipping creation');
    }
  } catch (error) {
    console.error('Error creating tables', error);
  }
}

module.exports = {
  pool,
  createTables
};

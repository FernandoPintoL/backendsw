const { pool } = require('./db');

// Whiteboard model functions
const whiteboardModel = {
  // Initialize whiteboard data for a room with a default page and drawer
  async initializeWhiteboard(roomId) {
    // Create a default drawer component
    const drawerComponentId = `component-drawer-${Date.now()}`;
    const drawerComponent = {
      id: drawerComponentId,
      type: 'drawer',
      x: 20,
      y: 20,
      width: 250,
      height: 400,
      title: 'Navigation',
      items: ['Page 1'],
      headerBgColor: '#2196F3',
      headerTextColor: '#FFFFFF'
    };

    const initialData = {
      pages: {
        'page-1': {
          id: 'page-1',
          name: 'Page 1',
          components: {
            [drawerComponentId]: drawerComponent
          }
        }
      },
      currentPage: 'page-1',
      pageOrder: ['page-1']
    };

    const result = await pool.query(
      'INSERT INTO whiteboard_data (room_id, data) VALUES ($1, $2) RETURNING *',
      [roomId, JSON.stringify(initialData)]
    );

    return result.rows[0];
  },

  // Get whiteboard data for a room
  async getWhiteboardData(roomId) {
    const result = await pool.query(
      'SELECT * FROM whiteboard_data WHERE room_id = $1',
      [roomId]
    );

    return result.rows[0];
  },

  // Update whiteboard data for a room
  async updateWhiteboardData(roomId, data) {
    const result = await pool.query(
      'UPDATE whiteboard_data SET data = $1, updated_at = CURRENT_TIMESTAMP WHERE room_id = $2 RETURNING *',
      [JSON.stringify(data), roomId]
    );

    return result.rows[0];
  }
};

module.exports = whiteboardModel;

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');

// Import routers
const authRouter = require('./router/authRouter');
const roomRouter = require('./router/roomRouter');
const whiteboardRouter = require('./router/whiteboardRouter');
const sketchRouter = require('./router/sketchRouter');
const flutterRouter = require('./router/flutterRouter');

// Import controllers
const socketController = require('./controllers/socketController');
const designController = require('./controllers/designController');

// Import database
const { pool } = require('./models/db');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Mount routers
app.use('/api', authRouter);
app.use('/api/rooms', roomRouter);
app.use('/api/rooms', whiteboardRouter);
app.use('/api/whiteboard', sketchRouter);
app.use('/api/flutter', flutterRouter);

// Initialize controllers
socketController.initialize(io);
designController.initialize(io);

// Start server
const PORT = process.env.PORT || 4200;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

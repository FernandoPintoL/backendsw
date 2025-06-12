const whiteboardModel = require('../models/whiteboardModel');
const roomModel = require('../models/roomModel');
const fs = require('fs');
const path = require('path');

// Whiteboard controller
const whiteboardController = {
  // Get whiteboard data
  async getWhiteboardData(req, res) {
    try {
      const { roomId } = req.params;
      const userId = req.user.id;

      // Check if user is a member of the room
      const isMember = await roomModel.isMember(roomId, userId);

      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to access this room' });
      }

      // Get whiteboard data
      const whiteboardData = await whiteboardModel.getWhiteboardData(roomId);

      if (!whiteboardData) {
        return res.status(404).json({ message: 'Whiteboard data not found' });
      }

      res.json(whiteboardData.data);
    } catch (error) {
      console.error('Error fetching whiteboard data', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Upload sketch and convert to components
  async uploadSketch(req, res) {
    try {
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const { roomId } = req.body;
      const userId = req.user.id;
      const filePath = req.file.path;

      // Check if user is a member of the room
      const isMember = await roomModel.isMember(roomId, userId);

      if (!isMember) {
        // Delete the uploaded file
        fs.unlinkSync(filePath);
        return res.status(403).json({ message: 'Not authorized to access this room' });
      }

      // Get whiteboard data
      let whiteboardData = await whiteboardModel.getWhiteboardData(roomId);

      if (!whiteboardData) {
        // Delete the uploaded file
        fs.unlinkSync(filePath);
        return res.status(404).json({ message: 'Whiteboard data not found' });
      }

      // Process the image and extract components
      const components = await processSketchImage(filePath, roomId);

      // Update whiteboard data with new components
      const currentData = whiteboardData.data || {};

      // Merge new components with existing ones
      const updatedComponents = { ...currentData };
      components.forEach(component => {
        const componentId = Date.now() + '-' + Math.round(Math.random() * 1E9);
        updatedComponents[componentId] = component;
      });

      // Update whiteboard data in database
      await whiteboardModel.updateWhiteboardData(roomId, updatedComponents);

      // Delete the uploaded file
      fs.unlinkSync(filePath);

      // Return the new components
      res.json({ components });
    } catch (error) {
      console.error('Error processing sketch', error);

      // Delete the uploaded file if it exists
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error('Error deleting uploaded file', unlinkError);
        }
      }

      res.status(500).json({ message: 'Server error' });
    }
  }
};

// Process sketch image and extract components
async function processSketchImage(filePath, roomId) {
  // This implementation creates components based on the uploaded sketch image
  // We're using a simplified approach that creates components based on the image
  // and positions them appropriately within the mobile device frame

  // Define constants for the phone frame dimensions
  const phoneFrameLeft = 12; // Left position of grid relative to wrapper
  const phoneFrameTop = 12; // Top position of grid relative to wrapper
  const phoneFrameWidth = 296; // Width of grid
  const phoneFrameHeight = 544; // Height of grid

  // Create components based on the image
  const components = [];

  try {
    // In a real implementation, we would use image processing libraries to analyze the image
    // For now, we'll create components that represent a typical UI layout
    // based on the assumption that the uploaded image is a UI mockup

    // Create a container for the header section
    components.push({
      type: 'container',
      x: phoneFrameLeft + 10,
      y: phoneFrameTop + 10,
      originalX: phoneFrameLeft + 10,
      originalY: phoneFrameTop + 10,
      width: phoneFrameWidth - 20,
      height: 60,
      bgColor: '#2196F3',
      borderRadius: 8,
      borderWidth: 0,
      borderColor: '#2196F3',
      borderStyle: 'solid',
      content: ''
    });

    // Add a text component for the header title
    components.push({
      type: 'text',
      x: phoneFrameLeft + 20,
      y: phoneFrameTop + 25,
      originalX: phoneFrameLeft + 20,
      originalY: phoneFrameTop + 25,
      width: phoneFrameWidth - 40,
      height: 30,
      content: 'App Title',
      fontSize: 'large',
      bgColor: 'transparent',
      textColor: '#ffffff'
    });

    // Add a container for the main content area
    components.push({
      type: 'container',
      x: phoneFrameLeft + 10,
      y: phoneFrameTop + 80,
      originalX: phoneFrameLeft + 10,
      originalY: phoneFrameTop + 80,
      width: phoneFrameWidth - 20,
      height: phoneFrameHeight - 160,
      bgColor: '#ffffff',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#e0e0e0',
      borderStyle: 'solid',
      content: ''
    });

    // Add a text component for a section title
    components.push({
      type: 'text',
      x: phoneFrameLeft + 20,
      y: phoneFrameTop + 100,
      originalX: phoneFrameLeft + 20,
      originalY: phoneFrameTop + 100,
      width: phoneFrameWidth - 40,
      height: 30,
      content: 'Section Title',
      fontSize: 'medium',
      bgColor: 'transparent',
      textColor: '#333333'
    });

    // Add an image component for a banner or hero image
    components.push({
      type: 'image',
      x: phoneFrameLeft + 20,
      y: phoneFrameTop + 140,
      originalX: phoneFrameLeft + 20,
      originalY: phoneFrameTop + 140,
      width: phoneFrameWidth - 40,
      height: 120,
      altText: 'Banner Image',
      imageUrl: '',
      bgColor: '#f5f5f5'
    });

    // Add a ListView component for a list of items
    components.push({
      type: 'listview',
      x: phoneFrameLeft + 20,
      y: phoneFrameTop + 270,
      originalX: phoneFrameLeft + 20,
      originalY: phoneFrameTop + 270,
      width: phoneFrameWidth - 40,
      height: 200,
      items: ['List Item 1', 'List Item 2', 'List Item 3', 'List Item 4'],
      scrollDirection: 'vertical',
      bgColor: '#ffffff',
      spacing: 8,
      paddingTop: 8,
      paddingRight: 8,
      paddingBottom: 8,
      paddingLeft: 8,
      marginTop: 0,
      marginRight: 0,
      marginBottom: 0,
      marginLeft: 0
    });

    // Add a button component at the bottom
    components.push({
      type: 'elevatedbutton',
      x: phoneFrameLeft + (phoneFrameWidth - 150) / 2,
      y: phoneFrameTop + phoneFrameHeight - 70,
      originalX: phoneFrameLeft + (phoneFrameWidth - 150) / 2,
      originalY: phoneFrameTop + phoneFrameHeight - 70,
      width: 150,
      height: 50,
      text: 'Action Button',
      bgColor: '#4CAF50',
      textColor: '#ffffff'
    });

    console.log(`Created ${components.length} components from sketch image`);
  } catch (error) {
    console.error('Error processing sketch image:', error);
    // If there's an error, create a fallback container component
    components.push({
      type: 'container',
      x: phoneFrameLeft + 20,
      y: phoneFrameTop + 20,
      originalX: phoneFrameLeft + 20,
      originalY: phoneFrameTop + 20,
      width: phoneFrameWidth - 40,
      height: phoneFrameHeight / 2,
      bgColor: '#E3F2FD',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#2196F3',
      borderStyle: 'dashed',
      content: 'Error processing sketch image'
    });
  }

  return components;
}

module.exports = whiteboardController;

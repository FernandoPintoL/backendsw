const jwt = require('jsonwebtoken');
const whiteboardModel = require('../models/whiteboardModel');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Design controller
const designController = {
  // Initialize socket.io
  initialize(io) {
    io.on('connection', (socket) => {
      console.log('Design controller: New client connected');

      // Handle Flutter component JSON
      socket.on('flutterComponent', async (data) => {
        const { roomId, componentJSON, token } = data;

        try {
          // Verify token
          const user = jwt.verify(token, JWT_SECRET);

          console.log(`Received Flutter component from ${user.username} for room ${roomId}`);

          // Parse the component JSON
          let parsedJSON;
          try {
            parsedJSON = typeof componentJSON === 'string'
              ? JSON.parse(componentJSON)
              : componentJSON;

            // Log received structure for debugging
            console.log('Received component structure type:', parsedJSON.designType);
            console.log('Number of pages:', parsedJSON.pages?.length || 0);
            if (parsedJSON.pages && parsedJSON.pages.length > 0) {
              console.log('First page name:', parsedJSON.pages[0].name);
              console.log('Number of components:', parsedJSON.pages[0].components?.length || 0);
            }
          } catch (error) {
            console.error('Error parsing component JSON:', error);
            socket.emit('flutterComponentAdded', {
              success: false,
              message: `Error parsing component JSON: ${error.message}`
            });
            return;
          }

          // Get current whiteboard data
          const whiteboardData = await whiteboardModel.getWhiteboardData(roomId);

          if (!whiteboardData) {
            console.error('No whiteboard data found for room:', roomId);
            return;
          }

          // Get the current page data
          const currentPage = whiteboardData.data.currentPage || 'page-1';
          const pages = whiteboardData.data.pages || {};

          // Ensure the current page exists
          if (!pages[currentPage]) {
            console.error('Current page not found:', currentPage);
            return;
          }

          // Get the components for the current page
          const components = pages[currentPage].components || {};

          // Variable to store the component ID
          let componentId;
          let component = null;

          // Check if the JSON has the expected structure
          if (parsedJSON.designType === 'flutter' && Array.isArray(parsedJSON.pages) && parsedJSON.pages.length > 0) {
            console.log('Received Flutter design with pages structure');

            // Extract components from the first page in the pages array
            const flutterPage = parsedJSON.pages[0];
            if (flutterPage && Array.isArray(flutterPage.components) && flutterPage.components.length > 0) {
              // Process all components in the page
              flutterPage.components.forEach(comp => {
                // Ensure component has correct Flutter widget structure
                if (!comp.type) {
                  comp.type = 'flutter_widget';
                }

                // Add standard positioning if missing
                if (!comp.position) comp.position = { x: 100, y: 100 };
                else {
                  if (comp.position.x === undefined) comp.position.x = 100;
                  if (comp.position.y === undefined) comp.position.y = 100;
                }

                if (!comp.size) comp.size = { width: 300, height: 200 };
                else {
                  if (comp.size.width === undefined) comp.size.width = 300;
                  if (comp.size.height === undefined) comp.size.height = 200;
                }

                // Add the component to the components object
                const compId = comp.id || `component-flutter-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                comp.id = compId; // Ensure ID is set in the component
                components[compId] = comp;

                // Store the last component ID for response
                componentId = compId;
                component = comp;
              });

              console.log(`Added ${flutterPage.components.length} components to the whiteboard`);
            } else {
              console.error('No components found in the Flutter design');
              return;
            }
          } else if (parsedJSON.widget) {
            // Format with direct widget property
            console.log('Received Flutter widget format');

            component = {
              id: parsedJSON.id || `component-flutter-${Date.now()}`,
              type: 'flutter_widget',
              widget: parsedJSON.widget,
              position: parsedJSON.position || { x: 100, y: 100 },
              size: parsedJSON.size || { width: 300, height: 200 }
            };

            componentId = component.id;
            components[componentId] = component;
          } else {
            // Legacy format - single component
            console.log('Received legacy component format');

            // Add the component to the components object
            componentId = parsedJSON.id || `component-${Date.now()}`;
            component = parsedJSON;

            // Ensure it has the required properties
            if (!component.type) {
              component.type = 'flutter_widget';
            }

            // Ensure position and size are properly set
            if (!component.position) component.position = { x: 100, y: 100 };
            else {
              if (component.position.x === undefined) component.position.x = 100;
              if (component.position.y === undefined) component.position.y = 100;
            }

            if (!component.size) component.size = { width: 300, height: 200 };
            else {
              if (component.size.width === undefined) component.size.width = 300;
              if (component.size.height === undefined) component.size.height = 200;
            }

            components[componentId] = component;
          }

          // Update the whiteboard data
          const updatedWhiteboardData = {
            ...whiteboardData.data,
            pages: {
              ...pages,
              [currentPage]: {
                ...pages[currentPage],
                components
              }
            }
          };

          // Save the updated whiteboard data
          await whiteboardModel.updateWhiteboardData(roomId, updatedWhiteboardData);

          // Broadcast only the updated component, not the whole whiteboard
          io.to(roomId).emit('whiteboardUpdated', {
            type: 'componentAdded',
            pageId: currentPage,
            component: {
              [componentId]: component
            },
            editedBy: {
              userId: user.id,
              username: user.username
            }
          });

          // Send a confirmation message back to the client
          socket.emit('flutterComponentAdded', {
            success: true,
            message: 'Component added to the whiteboard',
            componentId: componentId,
            component: component
          });
        } catch (error) {
          console.error('Error handling Flutter component:', error);
          socket.emit('flutterComponentAdded', {
            success: false,
            message: 'Error adding component to the whiteboard'
          });
        }
      });
    });
  }
};

module.exports = designController;

const jwt = require('jsonwebtoken');
const roomModel = require('../models/roomModel');
const whiteboardModel = require('../models/whiteboardModel');
const axios = require('axios');

// Azure OpenAI Configuration
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY;
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT;

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// In-memory storage for chat messages (could be moved to a database in production)
const chatMessages = {};

/**
 * Function to send a message to Azure OpenAI and get a response
 * @param {string} message - The user message to send to Azure OpenAI
 * @returns {Promise<string>} - The response from Azure OpenAI
 */
async function sendMessageToAzureOpenAI(message) {
  // Check if the message is requesting a Flutter component
  const flutterComponentRegex = /(?:create|generate|make|design)\s+(?:a|an)?\s+(?:flutter)?\s+(text|textfield|table|checkbox|radio|select|container|button|listview)(?:\s+component)?/i;
  const match = message.match(flutterComponentRegex);

  if (match) {
    const componentType = match[1].toLowerCase();
    console.log(`Detected request for Flutter ${componentType} component`);

    // Extract properties from the message
    const properties = {};

    // Extract text for Text and Button components
    if (componentType === 'text' || componentType === 'button') {
      const textMatch = message.match(/(?:with|saying|that says|containing|with text)\s+["']([^"']+)["']/i);
      if (textMatch) {
        properties.text = textMatch[1];
      }
    }

    // Extract size
    const sizeMatch = message.match(/(?:with|of|having)\s+(?:size|dimensions|width and height)\s+(\d+)\s*x\s*(\d+)/i);
    if (sizeMatch) {
      properties.size = {
        width: parseInt(sizeMatch[1]),
        height: parseInt(sizeMatch[2])
      };
    }

    // Extract position
    const positionMatch = message.match(/(?:at|position|located at|coordinates)\s+\(?(\d+)\s*,\s*(\d+)\)?/i);
    if (positionMatch) {
      properties.position = {
        x: parseInt(positionMatch[1]),
        y: parseInt(positionMatch[2])
      };
    }

    // Extract color
    const colorMatch = message.match(/(?:with|having|in|of)\s+(?:color|background)\s+(?:of\s+)?["']?([a-zA-Z]+|#[0-9a-fA-F]{3,6})["']?/i);
    if (colorMatch) {
      properties.color = colorMatch[1];
    }

    // Extract labelText for TextField components
    if (componentType === 'textfield') {
      const labelTextMatch = message.match(/(?:with|having|labeled|label|with label|with labelText)\s+["']([^"']+)["']/i);
      if (labelTextMatch) {
        properties.labelText = labelTextMatch[1];
      }
    }

    // Check for parent-child relationship
    const childOfMatch = message.match(/(?:inside|within|child of|in)\s+(?:a|an|the)?\s+([a-zA-Z]+)(?:\s+with id\s+["']?([a-zA-Z0-9_-]+)["']?)?/i);
    if (childOfMatch) {
      const parentType = childOfMatch[1].toLowerCase();
      const parentId = childOfMatch[2] || `${parentType}-${Date.now()}`;

      // Create parent component if it doesn't exist in the message
      const parentComponent = generateFlutterComponentJSON(parentType, {
        id: parentId,
        size: {
          width: (properties.size?.width || 100) + 20,
          height: (properties.size?.height || 50) + 20
        },
        position: properties.position || { x: 10, y: 10 }
      });

      // Adjust child position to be relative to parent
      if (properties.position) {
        // Make the child position relative to parent with some padding
        properties.position = {
          x: 10,
          y: 10
        };
      }

      // Set parent reference
      properties.parent = parentId;

      // Generate child component
      const childComponent = generateFlutterComponentJSON(componentType, properties);
      childComponent.id = `${componentType}-${Date.now()}`;

      // Add child to parent's children array
      parentComponent.children.push(childComponent);

      // Return the parent component with its child
      return JSON.stringify(parentComponent, null, 2);
    } else {
      // Generate a standalone component
      const componentJSON = generateFlutterComponentJSON(componentType, {
        ...properties,
        id: `${componentType}-${Date.now()}`
      });

      // Return the JSON as a string
      return JSON.stringify(componentJSON, null, 2);
    }
  }

  // If not a Flutter component request, proceed with normal OpenAI processing
  try {
    const url = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=2023-05-15`;

    const response = await axios.post(
      url,
      {
        messages: [
          { role: "system", content: "You are a helpful assistant in a collaborative chat application." },
          { role: "user", content: message }
        ],
        max_tokens: 800
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': AZURE_OPENAI_API_KEY
        }
      }
    );

    // Extract the assistant's response from the API response
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling Azure OpenAI:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    return "Lo siento, no pude procesar tu mensaje en este momento.";
  }
}

// Generate separate Angular components for complex elements


// Process components for layout and hierarchy

// Function to generate JSON structure for Flutter components
function generateFlutterComponentJSON(componentType, properties = {}) {
  // Default position and size
  const position = properties.position || { x: 10, y: 10 };
  const size = properties.size || { width: 100, height: 50 };

  // Base component structure
  const component = {
    id: properties.id || `${componentType}-${Date.now()}`,
    type: componentType,
    position: {
      x: position.x,
      y: position.y
    },
    size: {
      width: size.width,
      height: size.height
    },
    properties: {},
    children: [],
    parent: properties.parent || null
  };

  // Add properties specific to each component type
  switch (componentType.toLowerCase()) {
    case 'text':
      component.properties = {
        text: properties.text || 'Text',
        fontSize: properties.fontSize || 16,
        color: properties.color || '#000000',
        fontWeight: properties.fontWeight || 'normal',
        textAlign: properties.textAlign || 'left'
      };
      break;

    case 'textfield':
      component.properties = {
        hintText: properties.hintText || 'Enter text',
        labelText: properties.labelText || 'Label',
        obscureText: properties.obscureText || false,
        maxLines: properties.maxLines || 1,
        keyboardType: properties.keyboardType || 'text'
      };
      break;

    case 'table':
      component.properties = {
        headers: properties.headers || ['Column 1', 'Column 2', 'Column 3'],
        rows: properties.rows || [
          ['Row 1, Cell 1', 'Row 1, Cell 2', 'Row 1, Cell 3'],
          ['Row 2, Cell 1', 'Row 2, Cell 2', 'Row 2, Cell 3']
        ],
        borderWidth: properties.borderWidth || 1,
        headerColor: properties.headerColor || '#EEEEEE'
      };
      break;

    case 'checkbox':
      component.properties = {
        label: properties.label || 'Checkbox',
        value: properties.value || false,
        activeColor: properties.activeColor || '#2196F3'
      };
      break;

    case 'radio':
      component.properties = {
        groupValue: properties.groupValue || 0,
        options: properties.options || [
          { value: 0, label: 'Option 1' },
          { value: 1, label: 'Option 2' }
        ],
        activeColor: properties.activeColor || '#2196F3'
      };
      break;

    case 'select':
      component.properties = {
        value: properties.value || 'Option 1',
        items: properties.items || ['Option 1', 'Option 2', 'Option 3'],
        labelText: properties.labelText || 'Select an option'
      };
      break;

    case 'container':
      component.properties = {
        color: properties.color || '#FFFFFF',
        borderRadius: properties.borderRadius || 0,
        borderWidth: properties.borderWidth || 0,
        borderColor: properties.borderColor || '#000000',
        padding: properties.padding || { left: 0, top: 0, right: 0, bottom: 0 }
      };
      // Add children if provided
      if (properties.children && Array.isArray(properties.children)) {
        component.children = properties.children;
      }
      break;

    case 'button':
      component.properties = {
        text: properties.text || 'Button',
        color: properties.color || '#2196F3',
        textColor: properties.textColor || '#FFFFFF',
        borderRadius: properties.borderRadius || 4,
        elevation: properties.elevation || 2
      };
      break;

    case 'listview':
      component.properties = {
        items: properties.items || ['Item 1', 'Item 2', 'Item 3'],
        itemHeight: properties.itemHeight || 50,
        dividerHeight: properties.dividerHeight || 1,
        showDividers: properties.showDividers || true,
        scrollDirection: properties.scrollDirection || 'vertical'
      };
      break;

    default:
      // For unknown component types, just pass through the properties
      component.properties = properties;
  }

  return component;
}

// Socket controller
const socketController = {
  // Initialize socket.io
  initialize(io) {
    io.on('connection', (socket) => {
      console.log('New client connected');

      // Join a room
      socket.on('joinRoom', async (data) => {
        const { roomId, token } = data;

        try {
          // Verify token
          const user = jwt.verify(token, JWT_SECRET);

          // Check if user is a member of the room
          const isMember = await roomModel.isMember(roomId, user.id);

          if (!isMember) {
            return;
          }

          // Join the socket room
          socket.join(roomId);
          console.log(`Client joined room: ${roomId}, User: ${user.username}`);

          // Store user info in socket
          socket.userData = {
            userId: user.id,
            username: user.username,
            roomId: roomId
          };

          // Notify all clients in the room that a new user has joined
          io.to(roomId).emit('userJoined', {
            userId: user.id,
            username: user.username
          });

          // Get all connected users in the room
          const connectedSockets = await io.in(roomId).fetchSockets();
          const connectedUsers = connectedSockets
            .filter(s => s.userData)
            .map(s => ({
              userId: s.userData.userId,
              username: s.userData.username
            }));

          // Send the list of connected users to the client
          socket.emit('connectedUsers', connectedUsers);

          // Initialize chat messages for the room if they don't exist
          if (!chatMessages[roomId]) {
            chatMessages[roomId] = [];
          }

          // Send chat history to the client
          socket.emit('chatHistory', chatMessages[roomId]);
        } catch (error) {
          console.error('Error joining room', error);
        }
      });

      // Handle whiteboard updates
      socket.on('whiteboardUpdate', async (data) => {
        const { roomId, components, editedComponentId, token } = data;

        try {
          // Verify token
          const user = jwt.verify(token, JWT_SECRET);

          // Check if user is a member of the room
          const isMember = await roomModel.isMember(roomId, user.id);

          if (!isMember) {
            return;
          }

          // Update whiteboard data in database
          await whiteboardModel.updateWhiteboardData(roomId, components);

          // Broadcast to all clients in the room including sender
          io.to(roomId).emit('whiteboardUpdated', {
            components,
            editedBy: {
              userId: user.id,
              username: user.username,
              componentId: editedComponentId
            }
          });
        } catch (error) {
          console.error('Error updating whiteboard', error);
        }
      });


      // Generate Flutter code
      socket.on('generateFlutterCode', async (data) => {
        const { roomId, token } = data;

        try {
          // Verify token
          const user = jwt.verify(token, JWT_SECRET);

          // Check if user is a member of the room
          const isMember = await roomModel.isMember(roomId, user.id);

          if (!isMember) {
            return;
          }

          // Get whiteboard data
          const whiteboardData = await whiteboardModel.getWhiteboardData(roomId);

          if (!whiteboardData) {
            return;
          }

          const components = whiteboardData.data;

          // Generate Flutter code
          const flutterCode = generateFlutterCode(components);

          // Send generated code back to the client
          socket.emit('flutterCodeGenerated', flutterCode);
        } catch (error) {
          console.error('Error generating Flutter code', error);
        }
      });

      // Handle chat messages
      socket.on('chatMessage', async (data) => {
        const { roomId, userId, username, content, timestamp, token } = data;

        try {
          // Verify token
          const user = jwt.verify(token, JWT_SECRET);

          // Check if user is a member of the room
          const isMember = await roomModel.isMember(roomId, user.id);

          if (!isMember) {
            return;
          }

          // Create message object
          const message = {
            userId,
            username,
            content,
            timestamp
          };

          // Initialize chat messages for the room if they don't exist
          if (!chatMessages[roomId]) {
            chatMessages[roomId] = [];
          }

          // Add message to chat history
          chatMessages[roomId].push(message);

          // Limit chat history to 100 messages per room
          if (chatMessages[roomId].length > 100) {
            chatMessages[roomId] = chatMessages[roomId].slice(-100);
          }

          // Broadcast message to all clients in the room
          io.to(roomId).emit('chatMessage', message);

          // Send message to Azure OpenAI and get response
          try {
            const aiResponse = await sendMessageToAzureOpenAI(content);

            // Create AI message object
            const aiMessage = {
              userId: 'ai-assistant', // Special ID for the AI
              username: 'AI Assistant', // Display name for the AI
              content: aiResponse,
              timestamp: new Date().toISOString()
            };

            // Add AI message to chat history
            chatMessages[roomId].push(aiMessage);

            // Limit chat history to 100 messages per room
            if (chatMessages[roomId].length > 100) {
              chatMessages[roomId] = chatMessages[roomId].slice(-100);
            }

            // Broadcast AI message to all clients in the room
            io.to(roomId).emit('chatMessage', aiMessage);
          } catch (aiError) {
            console.error('Error getting AI response', aiError);
          }
        } catch (error) {
          console.error('Error handling chat message', error);
        }
      });

      // Disconnect
      socket.on('disconnect', () => {
        console.log('Client disconnected');

        // If the socket was in a room, notify other clients
        if (socket.userData) {
          const { roomId, userId, username } = socket.userData;

          // Notify all clients in the room that a user has left
          io.to(roomId).emit('userLeft', {
            userId,
            username
          });

          console.log(`User ${username} left room: ${roomId}`);
        }
      });
    });
  }
};
// Helper function to process color values for Flutter
function processColor(color) {
  if (!color) return 'Colors.transparent';

  // Handle 'transparent' string explicitly
  if (color === 'transparent') return 'Colors.transparent';

  // If it's already a Flutter color (e.g., Colors.blue), return as is
  if (color.startsWith('Colors.') || color.startsWith('Color(')) {
    return color;
  }

  // If it's a hex color (e.g., #ee4949), convert to Flutter Color
  if (color.startsWith('#')) {
    // Remove the # and ensure 6 characters
    const hex = color.substring(1).padEnd(6, '0');
    // Add alpha channel (FF) for full opacity and return Flutter Color
    return `Color(0xFF${hex.toUpperCase()})`;
  }

  // Default fallback
  return 'Colors.transparent';
}

// Function to generate Flutter code from components
function generateFlutterCode(components) {
  if (!components || Object.keys(components).length === 0) {
    return {
      pubspec: generatePubspecYaml(),
      main: generateMainDart(),
      screens: []
    };
  }

  // Check if we have the new multi-page structure
  if (components.pages && components.pageOrder) {
    // Generate pubspec.yaml
    const pubspecYaml = generatePubspecYaml();

    // Generate main.dart with navigation
    const mainDart = generateMainDartWithNavigation(components.pageOrder, components.pages);

    // Generate screen dart files for each page
    const screens = [];

    components.pageOrder.forEach(pageId => {
      const page = components.pages[pageId];
      if (page && page.components) {
        // Convert page components object to array for processing, preserving IDs
        const pageComponentsArray = Object.entries(page.components).map(([id, component]) => {
          // Ensure each component has an id property that matches its key
          return { ...component, id };
        });

        // Process components to determine layout and hierarchy
        const processedComponents = processComponentsForFlutter(pageComponentsArray);

        // Generate screen for this page
        const screenCode = generateFlutterScreen(processedComponents, page.name, pageId, components.pages, components.pageOrder);
        screens.push({
          name: page.name,
          id: pageId,
          code: screenCode
        });
      }
    });

    return {
      pubspec: pubspecYaml,
      main: mainDart,
      screens: screens
    };
  } else {
    // Legacy code for single page
    // Convert components object to array for easier processing, preserving IDs
    const componentsArray = Object.entries(components).map(([id, component]) => {
      // Ensure each component has an id property that matches its key
      return { ...component, id };
    });

    // Process components to determine layout and hierarchy
    const processedComponents = processComponentsForFlutter(componentsArray);

    // Generate pubspec.yaml
    const pubspecYaml = generatePubspecYaml();

    // Generate main.dart
    const mainDart = generateMainDart();

    // Generate screen dart files
    const screens = generateFlutterScreens(processedComponents);

    return {
      pubspec: pubspecYaml,
      main: mainDart,
      screens: screens
    };
  }
}
// Function to process components for Flutter layout
function processComponentsForFlutter(components) {
  // Group components by their position to determine layout structure
  // This is a simplified version - in a real app, you'd need more sophisticated layout analysis
  // Sort components by y position to determine vertical order
  const sortedByY = [...components].sort((a, b) => a.y - b.y);
  // Group components that are roughly on the same horizontal line
  const rows = [];
  let currentRow = [];
  let currentY = null;
  sortedByY.forEach(component => {
    if (currentY === null || Math.abs(component.y - currentY) < 20) {
      // Component is on the same row
      currentRow.push(component);
      currentY = currentY === null ? component.y : Math.min(currentY, component.y);
    } else {
      // Component is on a new row
      if (currentRow.length > 0) {
        rows.push([...currentRow]);
      }
      currentRow = [component];
      currentY = component.y;
    }
  });
  // Add the last row if it has components
  if (currentRow.length > 0) {
    rows.push(currentRow);
  }
  // Sort components in each row by x position
  rows.forEach(row => {
    row.sort((a, b) => a.x - b.x);
  });
  return rows;
}
// Function to generate pubspec.yaml
function generatePubspecYaml() {
  return `name: flutter_app
description: A new Flutter project generated from whiteboard.

# The following line prevents the package from being accidentally published to
# pub.dev using \`flutter pub publish\`. This is preferred for private packages.
publish_to: 'none' # Remove this line if you wish to publish to pub.dev

# The following defines the version and build number for your application.
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.6
  provider: ^6.1.1
  shared_preferences: ^2.2.2
  http: ^1.1.2

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.1

flutter:
  uses-material-design: true

  # To add assets to your application, add an assets section, like this:
  # assets:
  #   - images/a_dot_burr.jpeg
  #   - images/a_dot_ham.jpeg
`;
}

// Function to generate main.dart
function generateMainDart() {
  return `import 'package:flutter/material.dart';
import 'package:flutter_app/screens/home_screen.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Demo',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        visualDensity: VisualDensity.adaptivePlatformDensity,
      ),
      home: const HomeScreen(),
    );
  }
}
`;
}

// Function to generate main.dart with navigation
function generateMainDartWithNavigation(pageOrder, pages) {
  // Generate imports for all screens
  const imports = pageOrder.map(pageId => {
    const page = pages[pageId];
    const screenName = getScreenClassName(page.name, pageId);
    return `import 'package:flutter_app/screens/${screenName.toLowerCase()}.dart';`;
  }).join('\n');

  // Generate routes for all screens
  const routes = pageOrder.map(pageId => {
    const page = pages[pageId];
    const screenName = getScreenClassName(page.name, pageId);
    return `        '/${screenName.toLowerCase()}': (context) => const ${screenName}(),`;
  }).join('\n');

  // Get the first page as the initial route
  const initialPage = pages[pageOrder[0]];
  const initialScreenName = getScreenClassName(initialPage.name, pageOrder[0]);

  return `import 'package:flutter/material.dart';
${imports}

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Demo',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        visualDensity: VisualDensity.adaptivePlatformDensity,
      ),
      initialRoute: '/${initialScreenName.toLowerCase()}',
      routes: {
${routes}
      },
    );
  }
}

// Navigation helper
class AppNavigation {
  static void navigateTo(BuildContext context, String routeName) {
    Navigator.pushNamed(context, routeName);
  }
}`;
}

// Helper function to convert page name to a valid class name
function getScreenClassName(pageName, pageId) {
  // Remove any non-alphanumeric characters and spaces
  let className = pageName.replace(/[^a-zA-Z0-9 ]/g, '');

  // Replace spaces with underscores
  className = className.replace(/ /g, '_');

  // Ensure it starts with a letter
  if (!/^[a-zA-Z]/.test(className)) {
    className = 'Screen_' + className;
  }

  // If the name is empty after processing, use the page ID
  if (!className) {
    className = 'Screen_' + pageId.replace(/-/g, '_');
  }

  // Ensure first letter is uppercase
  return className.charAt(0).toUpperCase() + className.slice(1);
}
// Function to generate Flutter screens
function generateFlutterScreens(processedComponents) {
  // For simplicity, we'll generate just one screen with all components
  const homeScreen = generateHomeScreen(processedComponents);

  return [
    {
      name: 'HomeScreen',
      path: 'screens/home_screen.dart',
      code: homeScreen
    }
  ];
}

// Function to generate a Flutter screen for a specific page
function generateFlutterScreen(processedComponents, pageName, pageId, allPages, pageOrder) {
  // Generate imports
  let imports = `import 'package:flutter/material.dart';\n\n`;

  // Flatten the rows into a single array of components
  const allComponents = processedComponents.flat();

  // Get a valid class name for the screen
  const screenClassName = getScreenClassName(pageName, pageId);

  // Generate navigation drawer items for all pages
  let navigationDrawerItems = '';

  if (pageOrder && allPages) {
    pageOrder.forEach(pid => {
      if (pid !== pageId) { // Don't include the current page
        const page = allPages[pid];
        if (page) {
          const screenName = getScreenClassName(page.name, pid);
          navigationDrawerItems += `
              ListTile(
                leading: Icon(Icons.screen_share),
                title: Text('${page.name}'),
                onTap: () {
                  Navigator.pushNamed(context, '/${screenName.toLowerCase()}');
                },
              ),`;
        }
      }
    });
  }

  // Collect ScrollController declarations from all components that need them
  let scrollControllerDeclarations = '';
  allComponents.forEach(component => {
    // For ListView components with scrollbar
    if (component.type === 'listview' && component.showScrollbar !== false) {
      // Add a unique ScrollController for each ListView component
      const controllerId = `_scrollController_${component.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
      scrollControllerDeclarations += `    final ${controllerId} = ScrollController();\n`;

      // Store the controller ID in the component for later use
      component.scrollControllerId = controllerId;
    }

    // For Radio components with multiple items (which use Scrollbar)
    if (component.type === 'radio' && component.radioItems && component.radioItems.length > 0) {
      // Add a unique ScrollController for each Radio component
      const controllerId = `_radioScrollController_${component.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
      scrollControllerDeclarations += `    final ${controllerId} = ScrollController();\n`;

      // Store the controller ID in the component for later use
      component.scrollControllerId = controllerId;
    }
  });

  // Generate class definition
  let classDefinition =
  `class ${screenClassName} extends StatelessWidget {
  const ${screenClassName}({super.key});

  @override
  Widget build(BuildContext context) {
    // Get the device screen size
    final screenSize = MediaQuery.of(context).size;

    // Calculate scaling factors based on design dimensions (320x568)
    final horizontalScale = screenSize.width / 320.0;
    final verticalScale = screenSize.height / 568.0;

${scrollControllerDeclarations}
    return Scaffold(
      appBar: AppBar(
        title: Text('${pageName}'),
      ),
      drawer: Drawer(
        child: ListView(
          padding: EdgeInsets.zero,
          children: <Widget>[
            DrawerHeader(
              decoration: BoxDecoration(
                color: Colors.blue,
              ),
              child: Text(
                'Navigation',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 24,
                ),
              ),
            ),${navigationDrawerItems}
          ],
        ),
      ),
      body: SingleChildScrollView(
        child: Container(
          width: screenSize.width,
          height: screenSize.height - AppBar().preferredSize.height - MediaQuery.of(context).padding.top,
          child: Stack(
            children: [
`;

  // Generate Positioned widgets for each component with exact coordinates
  allComponents.forEach(component => {
    // Format position values to ensure they are valid Dart doubles
    // If the value already has a decimal point, don't append .0
    const formatDartDouble = (value) => {
      // Convert to string to check if it contains a decimal point
      const strValue = String(value);
      return strValue.includes('.') ? strValue : `${value}.0`;
    };

    // Scale the position based on the device size
    classDefinition += `            Positioned(
              left: ${formatDartDouble(component.x)} * horizontalScale,
              top: ${formatDartDouble(component.y)} * verticalScale,
              child: ${generateFlutterWidget(component, 14, 'horizontalScale', 'verticalScale')},
            ),\n`;
  });

  // Close the class definition
  classDefinition += `          ],
        ),
      ),
    ),
    );
  }
}`;

  return imports + classDefinition;
}
// Function to generate home screen
function generateHomeScreen(rows) {
  // Generate imports
  let imports = `import 'package:flutter/material.dart';\n\n`;

  // Flatten the rows into a single array of components
  const allComponents = rows.flat();

  // Generate class definition
  let classDefinition =
  `class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Get the device screen size
    final screenSize = MediaQuery.of(context).size;

    // Calculate scaling factors based on design dimensions (320x568)
    final horizontalScale = screenSize.width / 320.0;
    final verticalScale = screenSize.height / 568.0;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Flutter App'),
      ),
      body: SingleChildScrollView(
        child: Container(
          width: screenSize.width,
          height: screenSize.height - AppBar().preferredSize.height - MediaQuery.of(context).padding.top,
          child: Stack(
            children: [
`;

  // Generate Positioned widgets for each component with exact coordinates
  allComponents.forEach(component => {
    // Format position values to ensure they are valid Dart doubles
    // If the value already has a decimal point, don't append .0
    const formatDartDouble = (value) => {
      // Convert to string to check if it contains a decimal point
      const strValue = String(value);
      return strValue.includes('.') ? strValue : `${value}.0`;
    };

    // Scale the position based on the device size
    classDefinition += `            Positioned(
              left: ${formatDartDouble(component.x)} * horizontalScale,
              top: ${formatDartDouble(component.y)} * verticalScale,
              child: ${generateFlutterWidget(component, 14, 'horizontalScale', 'verticalScale')},
            ),\n`;
  });

  // Close the class definition
  classDefinition += `          ],
        ),
      ),
    ),
    );
  }
}`;

  return imports + classDefinition;
}

// Function to generate Flutter widget based on component type
function generateFlutterWidget(component, indentLevel, horizontalScaleFactor = null, verticalScaleFactor = null) {
  const indent = ' '.repeat(indentLevel);
  const type = component.type;

  // Apply scaling factors if provided
  const useScaling = horizontalScaleFactor !== null && verticalScaleFactor !== null;

  switch (type) {
    case 'container':
      return generateContainerWidget(component, indentLevel, horizontalScaleFactor, verticalScaleFactor);
    case 'text':
      return generateTextWidget(component, indentLevel, horizontalScaleFactor, verticalScaleFactor);
    case 'elevatedbutton':
      return generateElevatedButtonWidget(component, indentLevel, horizontalScaleFactor, verticalScaleFactor);
    case 'textfield':
      return generateTextFieldWidget(component, indentLevel, horizontalScaleFactor, verticalScaleFactor);
    case 'column':
      return generateColumnWidget(component, indentLevel, horizontalScaleFactor, verticalScaleFactor);
    case 'row':
      return generateRowWidget(component, indentLevel, horizontalScaleFactor, verticalScaleFactor);
    case 'stack':
      return generateStackWidget(component, indentLevel, horizontalScaleFactor, verticalScaleFactor);
    case 'padding':
      return generatePaddingWidget(component, indentLevel, horizontalScaleFactor, verticalScaleFactor);
    case 'center':
      return generateCenterWidget(component, indentLevel, horizontalScaleFactor, verticalScaleFactor);
    case 'expanded':
      return generateExpandedWidget(component, indentLevel, horizontalScaleFactor, verticalScaleFactor);
    case 'sizedbox':
      return generateSizedBoxWidget(component, indentLevel, horizontalScaleFactor, verticalScaleFactor);
    case 'circleavatar':
      return generateCircleAvatarWidget(component, indentLevel, horizontalScaleFactor, verticalScaleFactor);
    case 'icon':
      return generateIconWidget(component, indentLevel, horizontalScaleFactor, verticalScaleFactor);
    case 'switch':
      return generateSwitchWidget(component, indentLevel, horizontalScaleFactor, verticalScaleFactor);
    case 'checkbox':
      return generateCheckboxWidget(component, indentLevel, horizontalScaleFactor, verticalScaleFactor);
    case 'radio':
      return generateRadioWidget(component, indentLevel, horizontalScaleFactor, verticalScaleFactor);
    case 'slider':
      return generateSliderWidget(component, indentLevel, horizontalScaleFactor, verticalScaleFactor);
    case 'appbar':
      return generateAppBarWidget(component, indentLevel, horizontalScaleFactor, verticalScaleFactor);
    case 'bottomnavigationbar':
      return generateBottomNavigationBarWidget(component, indentLevel, horizontalScaleFactor, verticalScaleFactor);
    case 'floatingactionbutton':
      return generateFloatingActionButtonWidget(component, indentLevel, horizontalScaleFactor, verticalScaleFactor);
    case 'card':
      return generateCardWidget(component, indentLevel, horizontalScaleFactor, verticalScaleFactor);
    case 'listtile':
      return generateListTileWidget(component, indentLevel, horizontalScaleFactor, verticalScaleFactor);
    case 'drawer':
      return generateDrawerWidget(component, indentLevel, horizontalScaleFactor, verticalScaleFactor);
    case 'tabbar':
      return generateTabBarWidget(component, indentLevel, horizontalScaleFactor, verticalScaleFactor);
    case 'snackbar':
      return generateSnackBarWidget(component, indentLevel, horizontalScaleFactor, verticalScaleFactor);
    case 'listview':
      return generateListViewWidget(component, indentLevel, horizontalScaleFactor, verticalScaleFactor);
    case 'image':
      return generateImageWidget(component, indentLevel, horizontalScaleFactor, verticalScaleFactor);
    case 'table':
      // For tables, we want to ensure they're fully responsive and can display all data
      return generateTableWidget(component, indentLevel, horizontalScaleFactor, verticalScaleFactor);
    case 'select':
      return generateSelectWidget(component, indentLevel, horizontalScaleFactor, verticalScaleFactor);
    default:
      return `${indent}const Text('Unsupported component: ${type}')`;
  }
}

// Helper functions to generate specific Flutter widgets
function generateContainerWidget(component, indentLevel, horizontalScaleFactor = null, verticalScaleFactor = null) {
  const indent = ' '.repeat(indentLevel);
  const content = component.content || '';
  const width = component.width || 200;
  const height = component.height || 150;
  const bgColor = processColor(component.bgColor || '#e3f2fd'); // #e3f2fd is light blue (Colors.blue.shade50)
  const borderRadius = component.borderRadius || 0;

  // Apply scaling if scaling factors are provided
  const useScaling = horizontalScaleFactor !== null && verticalScaleFactor !== null;
  const scaledWidth = useScaling ? `${width}.0 * ${horizontalScaleFactor}` : `${width}.0`;
  const scaledHeight = useScaling ? `${height}.0 * ${verticalScaleFactor}` : `${height}.0`;

  // Conditionally include Text widget only if content is provided
  const childWidget = content 
    ? `const Center(
${indent}    child: Text('${content}'),
${indent}  )`
    : 'null';

  return `${indent}Container(
${indent}  width: ${scaledWidth},
${indent}  height: ${scaledHeight},
${indent}  padding: const EdgeInsets.all(10.0),
${indent}  decoration: BoxDecoration(
${indent}    color: ${bgColor},
${indent}    borderRadius: BorderRadius.circular(${borderRadius}.0),
${indent}    border: Border.all(
${indent}      color: Colors.blue,
${indent}      width: 1.0,
${indent}      style: BorderStyle.solid,
${indent}    ),
${indent}  ),
${indent}  child: ${childWidget},
${indent})`;
}
function generateTextWidget(component, indentLevel, horizontalScaleFactor = null, verticalScaleFactor = null) {
  const indent = ' '.repeat(indentLevel);
  const content = component.content || 'Text content';
  const width = component.width || 200;
  const height = component.height || 50;
  const textColor = processColor(component.textColor || '#000000'); // #000000 is black
  const bgColor = processColor(component.bgColor);

  // Determine font size based on component properties
  let fontSize = 16.0; // Default font size
  if (component.fontSizeType === 'custom' && component.fontSizePx) {
    fontSize = component.fontSizePx;
  } else if (component.fontSizeType === 'preset' && component.fontSize) {
    // Map preset sizes to pixel values
    const fontSizeMap = {
      small: 12.0,
      medium: 16.0,
      large: 20.0,
      xlarge: 24.0
    };
    fontSize = fontSizeMap[component.fontSize] || 16.0;
  }

  // Determine font weight
  const fontWeight = component.fontWeight === 'bold' ? 'FontWeight.bold' : 'FontWeight.normal';

  // Determine text alignment
  const textAlignMap = {
    'left': 'TextAlign.left',
    'center': 'TextAlign.center',
    'right': 'TextAlign.right',
    'justify': 'TextAlign.justify'
  };
  const textAlign = component.textAlign ? textAlignMap[component.textAlign] || 'TextAlign.left' : 'TextAlign.left';

  // Determine text style based on component.textStyle
  let textWidget;
  if (component.textStyle === 'h1') {
    textWidget = `${indent}    Text(
${indent}      '${content}',
${indent}      textAlign: ${textAlign},
${indent}      style: TextStyle(
${indent}        fontSize: ${fontSize}.0,
${indent}        fontWeight: FontWeight.bold,
${indent}        color: ${textColor},
${indent}      ),
${indent}    )`;
  } else if (component.textStyle === 'h2') {
    textWidget = `${indent}    Text(
${indent}      '${content}',
${indent}      textAlign: ${textAlign},
${indent}      style: TextStyle(
${indent}        fontSize: ${fontSize}.0,
${indent}        fontWeight: FontWeight.bold,
${indent}        color: ${textColor},
${indent}      ),
${indent}    )`;
  } else if (component.textStyle === 'h3') {
    textWidget = `${indent}    Text(
${indent}      '${content}',
${indent}      textAlign: ${textAlign},
${indent}      style: TextStyle(
${indent}        fontSize: ${fontSize}.0,
${indent}        fontWeight: FontWeight.bold,
${indent}        color: ${textColor},
${indent}      ),
${indent}    )`;
  } else {
    // Default paragraph style
    textWidget = `${indent}    Text(
${indent}      '${content}',
${indent}      textAlign: ${textAlign},
${indent}      style: TextStyle(
${indent}        fontSize: ${fontSize}.0,
${indent}        fontWeight: ${fontWeight},
${indent}        color: ${textColor},
${indent}      ),
${indent}    )`;
  }

  // Apply scaling if scaling factors are provided
  const useScaling = horizontalScaleFactor !== null && verticalScaleFactor !== null;
  const scaledWidth = useScaling ? `${width}.0 * ${horizontalScaleFactor}` : `${width}.0`;
  const scaledHeight = useScaling ? `${height}.0 * ${verticalScaleFactor}` : `${height}.0`;

  return `${indent}Container(
${indent}  width: ${scaledWidth},
${indent}  height: ${scaledHeight},
${indent}  color: ${bgColor},
${indent}  alignment: Alignment.center,
${indent}  child: ${textWidget},
${indent})`;
}

function generateElevatedButtonWidget(component, indentLevel, horizontalScaleFactor = null, verticalScaleFactor = null) {
  const indent = ' '.repeat(indentLevel);
  const text = component.text || 'Button';
  const width = component.width || 150;
  const height = component.height || 40;
  const bgColor = processColor(component.bgColor || '#2196F3'); // #2196F3 is blue
  const textColor = processColor(component.textColor || '#FFFFFF'); // #FFFFFF is white

  // Apply scaling if scaling factors are provided
  const useScaling = horizontalScaleFactor !== null && verticalScaleFactor !== null;
  const scaledWidth = useScaling ? `${width}.0 * ${horizontalScaleFactor}` : `${width}.0`;
  const scaledHeight = useScaling ? `${height}.0 * ${verticalScaleFactor}` : `${height}.0`;

  return `${indent}SizedBox(
${indent}  width: ${scaledWidth},
${indent}  height: ${scaledHeight},
${indent}  child: ElevatedButton(
${indent}    onPressed: () {},
${indent}    style: ElevatedButton.styleFrom(
${indent}      backgroundColor: ${bgColor},
${indent}      foregroundColor: ${textColor},
${indent}    ),
${indent}    child: Text('${text}'),
${indent}  ),
${indent})`;
}

function generateTextFieldWidget(component, indentLevel, horizontalScaleFactor = null, verticalScaleFactor = null) {
  const indent = ' '.repeat(indentLevel);
  const label = component.label || component.labelText || 'Label';
  const placeholder = component.placeholder || 'Enter text...';
  const width = component.width || 250;
  const height = component.height || 70;
  const bgColor = processColor(component.bgColor || '#ffffff');
  const textColor = processColor(component.textColor || '#000000');
  const labelColor = processColor(component.labelColor || '#2196F3');
  const labelSize = component.labelSize || 12.0;

  // Apply scaling if scaling factors are provided
  const useScaling = horizontalScaleFactor !== null && verticalScaleFactor !== null;
  const scaledWidth = useScaling ? `${width}.0 * ${horizontalScaleFactor}` : `${width}.0`;
  const scaledHeight = useScaling ? `${height}.0 * ${verticalScaleFactor}` : `${height}.0`;

  return `${indent}Container(
${indent}  width: ${scaledWidth},
${indent}  height: ${scaledHeight},
${indent}  padding: const EdgeInsets.all(10.0),
${indent}  child: Column(
${indent}    crossAxisAlignment: CrossAxisAlignment.start,
${indent}    children: [
${indent}      Text(
${indent}        '${label}',
${indent}        style: TextStyle(
${indent}          fontSize: ${labelSize}.0,
${indent}          color: ${labelColor},
${indent}        ),
${indent}      ),
${indent}      const SizedBox(height: 5.0),
${indent}      Container(
${indent}        decoration: BoxDecoration(
${indent}          color: ${bgColor},
${indent}          border: Border.all(color: Color(0xFFCCCCCC)),
${indent}          borderRadius: BorderRadius.circular(4.0),
${indent}        ),
${indent}        child: TextField(
${indent}          style: TextStyle(
${indent}            color: ${textColor},
${indent}          ),
${indent}          decoration: InputDecoration(
${indent}            hintText: '${placeholder}',
${indent}            contentPadding: const EdgeInsets.all(8.0),
${indent}            border: InputBorder.none,
${indent}          ),
${indent}        ),
${indent}      ),
${indent}    ],
${indent}  ),
${indent})`;
}

function generateColumnWidget(component, indentLevel, horizontalScaleFactor = null, verticalScaleFactor = null) {
  const indent = ' '.repeat(indentLevel);
  const items = component.items || ['Item 1', 'Item 2', 'Item 3'];
  const width = component.width || 200;
  const height = component.height || 300;
  const bgColor = processColor(component.bgColor);

  // Apply scaling if scaling factors are provided
  const useScaling = horizontalScaleFactor !== null && verticalScaleFactor !== null;
  const scaledWidth = useScaling ? `${width}.0 * ${horizontalScaleFactor}` : `${width}.0`;
  const scaledHeight = useScaling ? `${height}.0 * ${verticalScaleFactor}` : `${height}.0`;

  let childrenCode = '';
  items.forEach(item => {
    childrenCode += `${indent}    Text('${item}'),\n`;
  });

  return `${indent}Container(
${indent}  width: ${scaledWidth},
${indent}  height: ${scaledHeight},
${indent}  color: ${bgColor},
${indent}  child: Column(
${indent}    mainAxisAlignment: MainAxisAlignment.center,
${indent}    children: [
${childrenCode}${indent}    ],
${indent}  ),
${indent})`;
}

function generateRowWidget(component, indentLevel, horizontalScaleFactor = null, verticalScaleFactor = null) {
  const indent = ' '.repeat(indentLevel);
  const items = component.items || ['Item 1', 'Item 2', 'Item 3'];
  const width = component.width || 300;
  const height = component.height || 100;
  const bgColor = processColor(component.bgColor);

  // Apply scaling if scaling factors are provided
  const useScaling = horizontalScaleFactor !== null && verticalScaleFactor !== null;
  const scaledWidth = useScaling ? `${width}.0 * ${horizontalScaleFactor}` : `${width}.0`;
  const scaledHeight = useScaling ? `${height}.0 * ${verticalScaleFactor}` : `${height}.0`;

  let childrenCode = '';
  items.forEach(item => {
    childrenCode += `${indent}    Text('${item}'),\n`;
  });

  return `${indent}Container(
${indent}  width: ${scaledWidth},
${indent}  height: ${scaledHeight},
${indent}  color: ${bgColor},
${indent}  child: Row(
${indent}    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
${indent}    children: [
${childrenCode}${indent}    ],
${indent}  ),
${indent})`;
}

function generateStackWidget(component, indentLevel, horizontalScaleFactor = null, verticalScaleFactor = null) {
  const indent = ' '.repeat(indentLevel);
  const content = component.content || 'Stack';
  const width = component.width || 250;
  const height = component.height || 250;
  const bgColor = processColor(component.bgColor);

  // Apply scaling if scaling factors are provided
  const useScaling = horizontalScaleFactor !== null && verticalScaleFactor !== null;
  const scaledWidth = useScaling ? `${width}.0 * ${horizontalScaleFactor}` : `${width}.0`;
  const scaledHeight = useScaling ? `${height}.0 * ${verticalScaleFactor}` : `${height}.0`;

  return `${indent}Container(
${indent}  width: ${scaledWidth},
${indent}  height: ${scaledHeight},
${indent}  color: ${bgColor},
${indent}  child: Stack(
${indent}    children: [
${indent}      Center(
${indent}        child: Text('${content}'),
${indent}      ),
${indent}    ],
${indent}  ),
${indent})`;
}

function generatePaddingWidget(component, indentLevel) {
  const indent = ' '.repeat(indentLevel);
  const content = component.content || 'Padded Content';
  const paddingTop = component.paddingTop || 16;
  const paddingRight = component.paddingRight || 16;
  const paddingBottom = component.paddingBottom || 16;
  const paddingLeft = component.paddingLeft || 16;

  return `${indent}Padding(
${indent}  padding: EdgeInsets.fromLTRB(${paddingLeft}.0, ${paddingTop}.0, ${paddingRight}.0, ${paddingBottom}.0),
${indent}  child: Text('${content}'),
${indent})`;
}

function generateCenterWidget(component, indentLevel) {
  const indent = ' '.repeat(indentLevel);
  const content = component.content || 'Centered Content';

  return `${indent}Center(
${indent}  child: Text('${content}'),
${indent})`;
}

function generateExpandedWidget(component, indentLevel) {
  const indent = ' '.repeat(indentLevel);
  const content = component.content || 'Expanded Content';

  return `${indent}Expanded(
${indent}  child: Container(
${indent}    color: Colors.blue.shade50,
${indent}    child: Center(
${indent}      child: Text('${content}'),
${indent}    ),
${indent}  ),
${indent})`;
}

function generateSizedBoxWidget(component, indentLevel, horizontalScaleFactor = null, verticalScaleFactor = null) {
  const indent = ' '.repeat(indentLevel);
  const width = component.width || 100;
  const height = component.height || 100;

  // Apply scaling if scaling factors are provided
  const useScaling = horizontalScaleFactor !== null && verticalScaleFactor !== null;
  const scaledWidth = useScaling ? `${width}.0 * ${horizontalScaleFactor}` : `${width}.0`;
  const scaledHeight = useScaling ? `${height}.0 * ${verticalScaleFactor}` : `${height}.0`;

  return `${indent}SizedBox(
${indent}  width: ${scaledWidth},
${indent}  height: ${scaledHeight},
${indent})`;
}

function generateCircleAvatarWidget(component, indentLevel, horizontalScaleFactor = null, verticalScaleFactor = null) {
  const indent = ' '.repeat(indentLevel);
  const initials = component.initials || 'AB';
  const bgColor = processColor(component.bgColor || '#2196F3'); // #2196F3 is blue
  const radius = component.radius || 40;

  // Apply scaling if scaling factors are provided
  const useScaling = horizontalScaleFactor !== null && verticalScaleFactor !== null;
  const scaledRadius = useScaling ? `${radius}.0 * ${horizontalScaleFactor}` : `${radius}.0`;

  return `${indent}CircleAvatar(
${indent}  backgroundColor: ${bgColor},
${indent}  radius: ${scaledRadius},
${indent}  child: Text(
${indent}    '${initials}',
${indent}    style: const TextStyle(
${indent}      color: Colors.white,
${indent}      fontWeight: FontWeight.bold,
${indent}    ),
${indent}  ),
${indent})`;
}

function generateIconWidget(component, indentLevel) {
  const indent = ' '.repeat(indentLevel);
  const icon = component.icon || '★';

  // Map common icon characters to Flutter Icons
  const iconMap = {
    '★': 'Icons.star',
    '♥': 'Icons.favorite',
    '✓': 'Icons.check',
    '✉': 'Icons.email',
    '📱': 'Icons.phone',
    '🔍': 'Icons.search',
    '⚙': 'Icons.settings',
    '+': 'Icons.add',
    '×': 'Icons.close',
    '⟲': 'Icons.refresh',
    '↑': 'Icons.arrow_upward',
    '↓': 'Icons.arrow_downward',
    '←': 'Icons.arrow_back',
    '→': 'Icons.arrow_forward',
    '⋮': 'Icons.more_vert',
    '≡': 'Icons.menu',
  };

  const flutterIcon = iconMap[icon] || 'Icons.star';

  return `${indent}Icon(
${indent}  ${flutterIcon},
${indent}  size: 24,
${indent}  color: Colors.blue,
${indent})`;
}

function generateSwitchWidget(component, indentLevel) {
  const indent = ' '.repeat(indentLevel);
  const isActive = component.isActive || false;

  return `${indent}Switch(
${indent}  value: ${isActive},
${indent}  onChanged: (value) {},
${indent})`;
}

function generateCheckboxWidget(component, indentLevel, horizontalScaleFactor = null, verticalScaleFactor = null) {
  const indent = ' '.repeat(indentLevel);
  const mode = component.mode || 'single';
  const width = component.width || 200;
  const height = component.height || (mode === 'multiple' ? 200 : 50);
  const bgColor = processColor(component.bgColor);
  const textColor = processColor(component.textColor || '#000000');

  // Apply scaling if scaling factors are provided
  const useScaling = horizontalScaleFactor !== null && verticalScaleFactor !== null;
  const scaledWidth = useScaling ? `${width}.0 * ${horizontalScaleFactor}` : `${width}.0`;
  const scaledHeight = useScaling ? `${height}.0 * ${verticalScaleFactor}` : `${height}.0`;

  // For single checkbox mode
  if (mode === 'single') {
    const isChecked = component.isChecked || false;
    const label = component.label || 'Checkbox';

    return `${indent}Container(
${indent}  width: ${scaledWidth},
${indent}  height: ${scaledHeight},
${indent}  padding: const EdgeInsets.all(6.0),
${indent}  decoration: BoxDecoration(
${indent}    color: ${bgColor},
${indent}    borderRadius: BorderRadius.circular(8.0),
${indent}    border: Border.all(color: Colors.grey.shade300, width: 0.5),
${indent}  ),
${indent}  child: Row(
${indent}    children: [
${indent}      SizedBox(
${indent}        width: 16.0,
${indent}        height: 16.0,
${indent}        child: Checkbox(
${indent}          value: ${isChecked},
${indent}          onChanged: (value) {},
${indent}          activeColor: Colors.blue,
${indent}          materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
${indent}        ),
${indent}      ),
${indent}      const SizedBox(width: 6.0),
${indent}      Text(
${indent}        '${label}',
${indent}        style: TextStyle(
${indent}          fontSize: 13.0,
${indent}          color: ${textColor},
${indent}        ),
${indent}      ),
${indent}    ],
${indent}  ),
${indent})`;
  } 
  // For multiple checkboxes mode
  else {
    const items = component.items || [];

    // Generate code for each checkbox item
    let checkboxItemsCode = '';
    items.forEach((item, index) => {
      const checked = item.checked || false;
      const itemLabel = item.label || `Checkbox ${index + 1}`;

      checkboxItemsCode += `${indent}      Row(
${indent}        children: [
${indent}          SizedBox(
${indent}            width: 16.0,
${indent}            height: 16.0,
${indent}            child: Checkbox(
${indent}              value: ${checked},
${indent}              onChanged: (value) {},
${indent}              activeColor: Colors.blue,
${indent}              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
${indent}            ),
${indent}          ),
${indent}          const SizedBox(width: 6.0),
${indent}          Text(
${indent}            '${itemLabel}',
${indent}            style: TextStyle(
${indent}              fontSize: 13.0,
${indent}              color: ${textColor},
${indent}            ),
${indent}          ),
${indent}        ],
${indent}      ),\n`;
    });

    // If no items, add a placeholder
    if (items.length === 0) {
      checkboxItemsCode = `${indent}      Text(
${indent}        'No checkboxes added',
${indent}        style: TextStyle(
${indent}          fontSize: 16.0,
${indent}          color: Colors.grey,
${indent}          fontStyle: FontStyle.italic,
${indent}        ),
${indent}      ),\n`;
    }

    return `${indent}Container(
${indent}  width: ${scaledWidth},
${indent}  height: ${scaledHeight},
${indent}  padding: const EdgeInsets.all(8.0),
${indent}  decoration: BoxDecoration(
${indent}    color: ${bgColor},
${indent}    borderRadius: BorderRadius.circular(8.0),
${indent}    border: Border.all(color: Colors.grey.shade300, width: 0.5),
${indent}  ),
${indent}  child: Column(
${indent}    crossAxisAlignment: CrossAxisAlignment.start,
${indent}    children: [
${checkboxItemsCode}${indent}    ],
${indent}  ),
${indent})`;
  }
}

function generateRadioWidget(component, indentLevel, horizontalScaleFactor = null, verticalScaleFactor = null) {
  const indent = ' '.repeat(indentLevel);
  const isSelected = component.isSelected || false;
  const backgroundColor = processColor(component.backgroundColor);
  const textColor = processColor(component.textColor || '#000000');
  const label = component.label || 'Radio Option';
  const groupLabel = component.groupLabel || 'Radio Group'; // Use groupLabel for the group label text
  const width = component.width || 230;
  const height = component.height || 150;
  const groupValue = component.groupValue || 'groupValue';
  const radioItems = component.radioItems || [
    { value: 'option1', label: 'Option 1', isSelected: true },
    { value: 'option2', label: 'Option 2', isSelected: false }
  ];

  // Apply scaling if scaling factors are provided
  const useScaling = horizontalScaleFactor !== null && verticalScaleFactor !== null;
  const scaledWidth = useScaling ? `${width}.0 * ${horizontalScaleFactor}` : `${width}.0`;
  const scaledHeight = useScaling ? `${height}.0 * ${verticalScaleFactor}` : `${height}.0`;

  // Generate multiple radio buttons if radioItems are provided
  if (radioItems.length > 0) {
    let radioWidgets = '';

    radioItems.forEach((item, index) => {
      const itemSelected = item.isSelected || false;
      const itemLabel = item.label || `Option ${index + 1}`;
      const itemValue = item.value || `option${index + 1}`;

      radioWidgets += `${indent}Row(
${indent}  children: [
${indent}    Radio<String>(
${indent}      value: '${itemValue}',
${indent}      groupValue: ${itemSelected ? `'${itemValue}'` : 'null'},
${indent}      activeColor: ${processColor(component.activeColor || '#2196F3')},
${indent}      fillColor: MaterialStateProperty.resolveWith<Color>((Set<MaterialState> states) {
${indent}        if (states.contains(MaterialState.selected)) {
${indent}          return ${processColor(component.activeColor || '#2196F3')};
${indent}        }
${indent}        return ${processColor(component.inactiveColor || '#9E9E9E')};
${indent}      }),
${indent}      onChanged: (value) {},
${indent}    ),
${indent}    SizedBox(width: 8),
${indent}    Text(
${indent}      '${itemLabel}',
${indent}      style: TextStyle(
${indent}        color: ${textColor},
${indent}        fontSize: ${component.fontSize || 14}.0,
${indent}        fontWeight: ${component.fontWeight || 'FontWeight.normal'},
${indent}      ),
${indent}    ),
${indent}  ],
${indent}),\n`;
    });

    return `${indent}Container(
${indent}  width: ${scaledWidth},
${indent}  height: ${scaledHeight},
${indent}  padding: EdgeInsets.all(${component.padding || 8}.0),
${indent}  decoration: BoxDecoration(
${indent}    color: ${backgroundColor},
${indent}    borderRadius: BorderRadius.circular(${component.borderRadius || 4}.0),
${indent}    border: ${component.borderWidth ? `Border.all(
${indent}      color: ${processColor(component.borderColor || '#9E9E9E')},
${indent}      width: ${component.borderWidth}.0,
${indent}    )` : 'null'},
${indent}  ),
${indent}  child: Column(
${indent}    crossAxisAlignment: CrossAxisAlignment.start,
${indent}    children: [
${indent}      ${component.showGroupLabel ? `Text(
${indent}        '${groupLabel}',
${indent}        style: TextStyle(
${indent}          color: ${textColor},
${indent}          fontSize: ${component.groupLabelFontSize || 16}.0,
${indent}          fontWeight: FontWeight.bold,
${indent}        ),
${indent}      ),
${indent}      SizedBox(height: 8),` : ''}
${indent}      Expanded(
${indent}        child: Scrollbar(
${indent}          thumbVisibility: true,
${indent}          thickness: 6.0,
${indent}          radius: const Radius.circular(4.0),
${indent}          controller: ${component.scrollControllerId || '_radioScrollController'},
${indent}          child: SingleChildScrollView(
${indent}            controller: ${component.scrollControllerId || '_radioScrollController'},
${indent}            physics: const BouncingScrollPhysics(),
${indent}            child: Column(
${indent}              crossAxisAlignment: CrossAxisAlignment.start,
${indent}              children: [
${radioWidgets}${indent}              ],
${indent}            ),
${indent}          ),
${indent}        ),
${indent}      ),
${indent}    ],
${indent}  ),
${indent})`;
  } else {
    // Fallback to single radio button if no items are provided
    return `${indent}Row(
${indent}  children: [
${indent}    Radio<bool>(
${indent}      value: true,
${indent}      groupValue: ${isSelected},
${indent}      activeColor: ${processColor(component.activeColor || '#2196F3')},
${indent}      fillColor: MaterialStateProperty.resolveWith<Color>((Set<MaterialState> states) {
${indent}        if (states.contains(MaterialState.selected)) {
${indent}          return ${processColor(component.activeColor || '#2196F3')};
${indent}        }
${indent}        return ${processColor(component.inactiveColor || '#9E9E9E')};
${indent}      }),
${indent}      onChanged: (value) {},
${indent}    ),
${indent}    SizedBox(width: 8),
${indent}    Text(
${indent}      '${label}',
${indent}      style: TextStyle(
${indent}        color: ${textColor},
${indent}        fontSize: ${component.fontSize || 14}.0,
${indent}        fontWeight: ${component.fontWeight || 'FontWeight.normal'},
${indent}      ),
${indent}    ),
${indent}  ],
${indent})`;
  }
}

function generateSliderWidget(component, indentLevel) {
  const indent = ' '.repeat(indentLevel);
  const value = component.value || 50;

  return `${indent}Slider(
${indent}  value: ${value}.0,
${indent}  min: 0,
${indent}  max: 100,
${indent}  onChanged: (value) {},
${indent})`;
}

function generateAppBarWidget(component, indentLevel) {
  const indent = ' '.repeat(indentLevel);
  const title = component.title || 'App Title';

  return `${indent}AppBar(
${indent}  title: Text('${title}'),
${indent}  actions: [
${indent}    IconButton(
${indent}      icon: const Icon(Icons.more_vert),
${indent}      onPressed: () {},
${indent}    ),
${indent}  ],
${indent})`;
}

function generateBottomNavigationBarWidget(component, indentLevel) {
  const indent = ' '.repeat(indentLevel);
  const items = component.items || ['Home', 'Search', 'Profile'];

  let itemsCode = '';
  items.forEach((item, index) => {
    const icon = index === 0 ? 'Icons.home' : (index === 1 ? 'Icons.search' : 'Icons.person');
    itemsCode += `${indent}    BottomNavigationBarItem(
${indent}      icon: Icon(${icon}),
${indent}      label: '${item}',
${indent}    ),\n`;
  });

  return `${indent}BottomNavigationBar(
${indent}  currentIndex: 0,
${indent}  onTap: (index) {},
${indent}  items: [
${itemsCode}${indent}  ],
${indent})`;
}

function generateFloatingActionButtonWidget(component, indentLevel) {
  const indent = ' '.repeat(indentLevel);
  const icon = component.icon || '+';

  return `${indent}FloatingActionButton(
${indent}  onPressed: () {},
${indent}  child: const Icon(Icons.add),
${indent})`;
}

function generateCardWidget(component, indentLevel) {
  const indent = ' '.repeat(indentLevel);
  const title = component.title || 'Card Title';
  const content = component.content || 'Card content goes here. This is a sample text.';

  return `${indent}Card(
${indent}  child: Padding(
${indent}    padding: const EdgeInsets.all(16.0),
${indent}    child: Column(
${indent}      crossAxisAlignment: CrossAxisAlignment.start,
${indent}      children: [
${indent}        Text(
${indent}          '${title}',
${indent}          style: const TextStyle(
${indent}            fontSize: 18,
${indent}            fontWeight: FontWeight.bold,
${indent}          ),
${indent}        ),
${indent}        const SizedBox(height: 8),
${indent}        Text('${content}'),
${indent}      ],
${indent}    ),
${indent}  ),
${indent})`;
}
function generateListTileWidget(component, indentLevel) {
  const indent = ' '.repeat(indentLevel);
  const title = component.title || 'List Tile Title';
  const subtitle = component.subtitle || 'Subtitle';

  return `${indent}ListTile(
${indent}  leading: const Icon(Icons.star),
${indent}  title: Text('${title}'),
${indent}  subtitle: Text('${subtitle}'),
${indent}  trailing: const Icon(Icons.arrow_forward_ios),
${indent}  onTap: () {},
${indent})`;
}
function generateDrawerWidget(component, indentLevel) {
  const indent = ' '.repeat(indentLevel);
  const title = component.title || 'Drawer';
  const items = component.items || ['Item 1', 'Item 2', 'Item 3'];

  let itemsCode = '';
  items.forEach((item, index) => {
    const icon = index === 0 ? 'Icons.home' : (index === 1 ? 'Icons.settings' : 'Icons.info');
    itemsCode += `${indent}      ListTile(
${indent}        leading: Icon(${icon}),
${indent}        title: Text('${item}'),
${indent}        onTap: () {},
${indent}      ),\n`;
  });
  return `${indent}Drawer(
${indent}  child: ListView(
${indent}    padding: EdgeInsets.zero,
${indent}    children: [
${indent}      DrawerHeader(
${indent}        decoration: const BoxDecoration(
${indent}          color: Colors.blue,
${indent}        ),
${indent}        child: Text(
${indent}          '${title}',
${indent}          style: const TextStyle(
${indent}            color: Colors.white,
${indent}            fontSize: 24,
${indent}          ),
${indent}        ),
${indent}      ), 
${itemsCode}${indent}    ],
${indent}  ),
${indent})`;
}
function generateTabBarWidget(component, indentLevel) {
  const indent = ' '.repeat(indentLevel);
  const tabs = component.tabs || ['Tab 1', 'Tab 2', 'Tab 3'];

  let tabsCode = '';
  tabs.forEach(tab => {
    tabsCode += `${indent}      Tab(text: '${tab}'),\n`;
  });
  return `${indent}DefaultTabController(
${indent}  length: ${tabs.length},
${indent}  child: Column(
${indent}    children: [
${indent}      TabBar(
${indent}        tabs: [
${tabsCode}${indent}        ],
${indent}      ),
${indent}      Expanded(
${indent}        child: TabBarView(
${indent}          children: [
${indent}            Center(child: Text('${tabs[0]} Content')),
${indent}            Center(child: Text('${tabs[1]} Content')),
${indent}            Center(child: Text('${tabs[2]} Content')),
${indent}          ],
${indent}        ),
${indent}      ),
${indent}    ],
${indent}  ),
${indent})`;
}
function generateSnackBarWidget(component, indentLevel) {
  const indent = ' '.repeat(indentLevel);
  const message = component.message || 'Snackbar message';
  return `${indent}ElevatedButton(
${indent}  onPressed: () {
${indent}    ScaffoldMessenger.of(context).showSnackBar(
${indent}      SnackBar(
${indent}        content: Text('${message}'),
${indent}        action: SnackBarAction(
${indent}          label: 'Action',
${indent}          onPressed: () {},
${indent}        ),
${indent}      ),
${indent}    );
${indent}  },
${indent}  child: const Text('Show SnackBar'),
${indent})`;
}
function generateListViewWidget(component, indentLevel, horizontalScaleFactor = null, verticalScaleFactor = null) {
  const indent = ' '.repeat(indentLevel);
  const items = component.items || ['Item 1', 'Item 2', 'Item 3', 'Item 4'];
  const width = component.width || 300;
  const height = component.height || 200;
  const cardWidth = component.cardWidth || 150;
  const cardHeight = component.cardHeight || null; // null means auto height
  const isHorizontal = component.scrollDirection === 'horizontal';
  const scrollDirection = isHorizontal ? 'Axis.horizontal' : 'Axis.vertical';
  const bgColor = processColor(component.bgColor || '#ffffff');
  const spacing = component.spacing || 4;
  const title = component.title || null; // Optional title for the ListView
  const showScrollbar = component.showScrollbar !== false; // Default to showing scrollbar

  // Apply scaling if scaling factors are provided
  const useScaling = horizontalScaleFactor !== null && verticalScaleFactor !== null;
  const scaledWidth = useScaling ? `${width}.0 * ${horizontalScaleFactor}` : `${width}.0`;
  const scaledHeight = useScaling ? `${height}.0 * ${verticalScaleFactor}` : `${height}.0`;
  const scaledCardWidth = useScaling ? `${cardWidth}.0 * ${horizontalScaleFactor}` : `${cardWidth}.0`;
  const scaledCardHeight = cardHeight ? (useScaling ? `${cardHeight}.0 * ${verticalScaleFactor}` : `${cardHeight}.0`) : null;

  // Padding values
  const paddingTop = component.paddingTop || 8;
  const paddingRight = component.paddingRight || 8;
  const paddingBottom = component.paddingBottom || 8;
  const paddingLeft = component.paddingLeft || 8;

  // Margin values
  const marginTop = component.marginTop || 0;
  const marginRight = component.marginRight || 0;
  const marginBottom = component.marginBottom || 0;
  const marginLeft = component.marginLeft || 0;

  let itemsCode = '';
  items.forEach((item, index) => {
    if (isHorizontal) {
      // For horizontal ListView, create items with configurable width and height
      // Add elevation and more visual appeal
      itemsCode += `${indent}      Card(
${indent}        elevation: 2.0,
${indent}        margin: EdgeInsets.only(right: ${spacing}.0),
${indent}        shape: RoundedRectangleBorder(
${indent}          borderRadius: BorderRadius.circular(8.0),
${indent}        ),
${indent}        child: Container(
${indent}          width: ${scaledCardWidth},
${indent}          ${scaledCardHeight ? `height: ${scaledCardHeight},` : ''}
${indent}          constraints: BoxConstraints(
${indent}            minWidth: 100.0,
${indent}            minHeight: 20.0,
${indent}          ),
${indent}          padding: const EdgeInsets.all(12),
${indent}          alignment: Alignment.center,
${indent}          child: Column(
${indent}            mainAxisAlignment: MainAxisAlignment.center,
${indent}            children: [
${indent}              Text(
${indent}                '${item}',
${indent}                textAlign: TextAlign.center,
${indent}                style: const TextStyle(fontWeight: FontWeight.w500),
${indent}              ),
${indent}            ],
${indent}          ),
${indent}        ),
${indent}      ),\n`;
    } else {
      // For vertical ListView, create items with configurable width and height
      itemsCode += `${indent}      Card(
${indent}        elevation: 2.0,
${indent}        margin: EdgeInsets.only(bottom: ${spacing}.0),
${indent}        shape: RoundedRectangleBorder(
${indent}          borderRadius: BorderRadius.circular(8.0),
${indent}        ),
${indent}        child: Container(
${indent}          ${cardWidth ? `width: ${scaledCardWidth},` : ''}
${indent}          ${scaledCardHeight ? `height: ${scaledCardHeight},` : ''}
${indent}          constraints: BoxConstraints(
${indent}            minWidth: 100.0,
${indent}            minHeight: 20.0,
${indent}          ),
${indent}          padding: const EdgeInsets.all(12),
${indent}          alignment: Alignment.center,
${indent}          child: Text(
${indent}            '${item}',
${indent}            style: const TextStyle(fontWeight: FontWeight.w500),
${indent}          ),
${indent}        ),
${indent}      ),\n`;
    }
  });

  // Get the ScrollController ID if it exists, otherwise use a default name
  // This controller ID is set in the generateFlutterScreen function
  const controllerId = component.scrollControllerId || '_scrollController';

  const containerCode = isHorizontal 
    ? `${indent}Container(
${indent}  width: ${scaledWidth},
${indent}  height: ${scaledHeight},
${indent}  margin: EdgeInsets.fromLTRB(${marginLeft}.0, ${marginTop}.0, ${marginRight}.0, ${marginBottom}.0),
${indent}  decoration: BoxDecoration(
${indent}    color: ${bgColor},
${indent}    borderRadius: BorderRadius.circular(4),
${indent}    border: Border.all(color: Colors.grey.shade300),
${indent}  ),
${indent}  clipBehavior: Clip.antiAlias, // Ensure content is clipped to the rounded corners
${indent}  child: Column(
${indent}    crossAxisAlignment: CrossAxisAlignment.start,
${indent}    children: [
${indent}      // Optional header for the ListView (only shown if title is provided)
${indent}      ${title ? `Padding(
${indent}        padding: EdgeInsets.fromLTRB(${paddingLeft}.0, ${paddingTop}.0, ${paddingRight}.0, 4.0),
${indent}        child: Text(
${indent}          '${title}',
${indent}          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
${indent}        ),
${indent}      ),` : ''}
${indent}      Expanded(
${indent}        child: ${showScrollbar ? `Scrollbar(
${indent}          thickness: 6.0,
${indent}          radius: const Radius.circular(8.0),
${indent}          thumbVisibility: true,
${indent}          controller: ${controllerId},
${indent}          child: ListView(
${indent}            controller: ${controllerId},
${indent}            scrollDirection: ${scrollDirection},
${indent}            physics: const BouncingScrollPhysics(), // iOS-like bouncing effect
${indent}            padding: EdgeInsets.fromLTRB(${paddingLeft}.0, 4.0, ${paddingRight}.0, ${paddingBottom}.0),
${indent}            children: [
${itemsCode}${indent}            ],
${indent}          ),
${indent}        ),` : `ListView(
${indent}            scrollDirection: ${scrollDirection},
${indent}            physics: const BouncingScrollPhysics(), // iOS-like bouncing effect
${indent}            padding: EdgeInsets.fromLTRB(${paddingLeft}.0, 4.0, ${paddingRight}.0, ${paddingBottom}.0),
${indent}            children: [
${itemsCode}${indent}            ],
${indent}          ),`}
${indent}      ),
${indent}    ],
${indent}  ),
${indent})`
    : `${indent}Container(
${indent}  width: ${scaledWidth},
${indent}  height: ${scaledHeight},
${indent}  margin: EdgeInsets.fromLTRB(${marginLeft}.0, ${marginTop}.0, ${marginRight}.0, ${marginBottom}.0),
${indent}  decoration: BoxDecoration(
${indent}    color: ${bgColor},
${indent}    borderRadius: BorderRadius.circular(4),
${indent}    border: Border.all(color: Colors.grey.shade300),
${indent}  ),
${indent}  clipBehavior: Clip.antiAlias, // Ensure content is clipped to the rounded corners
${indent}  child: Column(
${indent}    crossAxisAlignment: CrossAxisAlignment.start,
${indent}    children: [
${indent}      // Optional header for the ListView (only shown if title is provided)
${indent}      ${title ? `Padding(
${indent}        padding: EdgeInsets.fromLTRB(${paddingLeft}.0, ${paddingTop}.0, ${paddingRight}.0, 4.0),
${indent}        child: Text(
${indent}          '${title}',
${indent}          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
${indent}        ),
${indent}      ),` : ''}
${indent}      Expanded(
${indent}        child: ${showScrollbar ? `Scrollbar(
${indent}          thickness: 6.0,
${indent}          radius: const Radius.circular(8.0),
${indent}          thumbVisibility: true,
${indent}          controller: ${controllerId},
${indent}          child: ListView(
${indent}            controller: ${controllerId},
${indent}            scrollDirection: ${scrollDirection},
${indent}            physics: const BouncingScrollPhysics(), // iOS-like bouncing effect
${indent}            padding: EdgeInsets.fromLTRB(${paddingLeft}.0, 4.0, ${paddingRight}.0, ${paddingBottom}.0),
${indent}            children: [
${itemsCode}${indent}            ],
${indent}          ),
${indent}        ),` : `ListView(
${indent}            scrollDirection: ${scrollDirection},
${indent}            physics: const BouncingScrollPhysics(), // iOS-like bouncing effect
${indent}            padding: EdgeInsets.fromLTRB(${paddingLeft}.0, 4.0, ${paddingRight}.0, ${paddingBottom}.0),
${indent}            children: [
${itemsCode}${indent}            ],
${indent}          ),`}
${indent}      ),
${indent}    ],
${indent}  ),
${indent})`;

  // Return only the container code, as the ScrollController declaration is now handled in generateFlutterScreen
  return containerCode;
}
function generateImageWidget(component, indentLevel, horizontalScaleFactor = null, verticalScaleFactor = null) {
  const indent = ' '.repeat(indentLevel);
  const altText = component.altText || 'Image';
  const width = component.width || 200;
  const height = component.height || 150;
  const bgColor = processColor(component.bgColor || '#F5F5F5'); // #F5F5F5 is light gray

  // Apply scaling if scaling factors are provided
  const useScaling = horizontalScaleFactor !== null && verticalScaleFactor !== null;
  const scaledWidth = useScaling ? `${width}.0 * ${horizontalScaleFactor}` : `${width}.0`;
  const scaledHeight = useScaling ? `${height}.0 * ${verticalScaleFactor}` : `${height}.0`;

  return `${indent}Container(
${indent}  width: ${scaledWidth},
${indent}  height: ${scaledHeight},
${indent}  decoration: BoxDecoration(
${indent}    color: ${bgColor},
${indent}    border: Border.all(color: Colors.grey.shade300),
${indent}    borderRadius: BorderRadius.circular(4.0),
${indent}  ),
${indent}  child: Center(
${indent}    child: Text(
${indent}      '${altText}',
${indent}      style: TextStyle(
${indent}        color: Colors.grey.shade600,
${indent}        fontSize: 14.0,
${indent}      ),
${indent}    ),
${indent}  ),
${indent})`;
}
function generateTableWidget(component, indentLevel, horizontalScaleFactor = null, verticalScaleFactor = null) {
  const indent = ' '.repeat(indentLevel);
  const tableTitle = component.tableTitle || 'Data Table';
  const showTitle = component.showTitle !== false;
  const headers = component.headers || ['Header 1', 'Header 2', 'Header 3'];
  const rows = component.rows || [['Cell 1', 'Cell 2', 'Cell 3'], ['Cell 4', 'Cell 5', 'Cell 6']];

  // Apply scaling to width and height if scaling factors are provided
  const useScaling = horizontalScaleFactor !== null && verticalScaleFactor !== null;
  const width = component.width || 500;
  const height = component.height || 200;

  const bgColor = processColor(component.bgColor || '#ffffff');
  const headerBgColor = processColor(component.headerBgColor || '#f5f5f5');
  const textColor = processColor(component.textColor || '#000000');

  // Generate column definitions
  let columnsCode = '';
  headers.forEach((header, index) => {
    columnsCode += `${indent}      DataColumn(
${indent}        label: Expanded(
${indent}          child: Text(
${indent}            '${header}',
${indent}            style: TextStyle(
${indent}              fontWeight: FontWeight.bold,
${indent}              color: ${textColor},
${indent}            ),
${indent}            overflow: TextOverflow.ellipsis,
${indent}          ),
${indent}        ),
${indent}      ),\n`;
  });

  // Generate row definitions
  let rowsCode = '';
  rows.forEach((row, rowIndex) => {
    rowsCode += `${indent}      DataRow(
${indent}        cells: [
`;
    // Generate cell definitions for this row
    row.forEach((cell, cellIndex) => {
      if (cellIndex < headers.length) { // Only include cells that have corresponding headers
        rowsCode += `${indent}          DataCell(
${indent}            Text(
${indent}              '${cell}',
${indent}              overflow: TextOverflow.ellipsis,
${indent}            ),
${indent}          ),\n`;
      }
    });
    // If row has fewer cells than headers, add empty cells
    for (let i = row.length; i < headers.length; i++) {
      rowsCode += `${indent}          DataCell(Text('')),\n`;
    }
    rowsCode += `${indent}        ],
${indent}      ),\n`;
  });

  // Generate the complete widget with responsive layout
  return `${indent}LayoutBuilder(
${indent}  builder: (context, constraints) {
${indent}    // Calculate the available width and height
${indent}    final availableWidth = constraints.maxWidth;
${indent}    final availableHeight = constraints.maxHeight;
${indent}    
${indent}    // Apply scaling if scaling factors are provided
${indent}    final scaledWidth = ${useScaling ? `(${width}.0 * ${horizontalScaleFactor})` : `${width}.0`};
${indent}    final scaledHeight = ${useScaling ? `(${height}.0 * ${verticalScaleFactor})` : `${height}.0`};
${indent}    
${indent}    // Use the minimum of the scaled dimensions and available space
${indent}    final finalWidth = scaledWidth > availableWidth ? availableWidth : scaledWidth;
${indent}    final finalHeight = scaledHeight > availableHeight ? availableHeight : scaledHeight;
${indent}    
${indent}    // Create scroll controllers for the scrollbars
${indent}    final verticalController = ScrollController();
${indent}    final horizontalController = ScrollController();
${indent}    
${indent}    return Container(
${indent}      width: finalWidth,
${indent}      height: finalHeight,
${indent}      color: ${bgColor},
${indent}      child: Column(
${indent}        crossAxisAlignment: CrossAxisAlignment.start,
${indent}        children: [
${showTitle ? `${indent}          Padding(
${indent}            padding: const EdgeInsets.all(8.0),
${indent}            child: Text(
${indent}              '${tableTitle}',
${indent}              style: TextStyle(
${indent}                fontSize: ${useScaling ? `18 * ${horizontalScaleFactor}` : '18'},
${indent}                fontWeight: FontWeight.bold,
${indent}                color: ${textColor},
${indent}              ),
${indent}            ),
${indent}          ),` : ''}
${indent}          Expanded(
${indent}            child: Scrollbar(
${indent}              controller: verticalController,
${indent}              thumbVisibility: true,
${indent}              thickness: 8.0,
${indent}              radius: const Radius.circular(4.0),
${indent}              child: SingleChildScrollView(
${indent}                controller: verticalController,
${indent}                scrollDirection: Axis.vertical,
${indent}                child: Scrollbar(
${indent}                  controller: horizontalController,
${indent}                  thumbVisibility: true,
${indent}                  thickness: 8.0,
${indent}                  radius: const Radius.circular(4.0),
${indent}                  child: SingleChildScrollView(
${indent}                    controller: horizontalController,
${indent}                    scrollDirection: Axis.horizontal,
${indent}                    child: DataTable(
${indent}                      headingRowColor: MaterialStateProperty.all(${headerBgColor}),
${indent}                      columnSpacing: ${useScaling ? `20 * ${horizontalScaleFactor}` : '20'},
${indent}                      horizontalMargin: ${useScaling ? `10 * ${horizontalScaleFactor}` : '10'},
${indent}                      dataRowMinHeight: ${useScaling ? `48 * ${verticalScaleFactor}` : '48'},
${indent}                      dataRowMaxHeight: ${useScaling ? `64 * ${verticalScaleFactor}` : '64'},
${indent}                      columns: [
${columnsCode}${indent}                      ],
${indent}                      rows: [
${rowsCode}${indent}                      ],
${indent}                    ),
${indent}                  ),
${indent}                ),
${indent}              ),
${indent}            ),
${indent}          ),
${indent}        ],
${indent}      ),
${indent}    );
${indent}  },
${indent})`;
}

function generateSelectWidget(component, indentLevel, horizontalScaleFactor = null, verticalScaleFactor = null) {
  const indent = ' '.repeat(indentLevel);
  const label = component.label || 'Select';
  const placeholder = component.placeholder || 'Select an option';
  const options = component.options || ['Option 1', 'Option 2', 'Option 3'];
  const width = component.width || 250;
  const height = component.height || 70;
  const bgColor = processColor(component.bgColor || '#ffffff');
  const textColor = processColor(component.textColor || '#000000');

  // Apply scaling if scaling factors are provided
  const useScaling = horizontalScaleFactor !== null && verticalScaleFactor !== null;
  const scaledWidth = useScaling ? `${width}.0 * ${horizontalScaleFactor}` : `${width}.0`;
  const scaledHeight = useScaling ? `${height}.0 * ${verticalScaleFactor}` : `${height}.0`;

  // Generate dropdown items
  let itemsCode = '';
  options.forEach(option => {
    itemsCode += `${indent}      DropdownMenuItem<String>(
${indent}        value: '${option}',
${indent}        child: Text('${option}'),
${indent}      ),\n`;
  });

  return `${indent}Container(
${indent}  width: ${scaledWidth},
${indent}  height: ${scaledHeight},
${indent}  padding: const EdgeInsets.all(8.0),
${indent}  decoration: BoxDecoration(
${indent}    color: ${bgColor},
${indent}    borderRadius: BorderRadius.circular(8.0),
${indent}    border: Border.all(color: Colors.grey.shade300),
${indent}  ),
${indent}  child: Column(
${indent}    crossAxisAlignment: CrossAxisAlignment.start,
${indent}    children: [
${indent}      ${label ? `Padding(
${indent}        padding: const EdgeInsets.only(bottom: 8.0),
${indent}        child: Text(
${indent}          '${label}',
${indent}          style: TextStyle(
${indent}            fontSize: 14.0,
${indent}            color: ${textColor},
${indent}          ),
${indent}        ),
${indent}      ),` : ''}
${indent}      Expanded(
${indent}        child: DropdownButtonFormField<String>(
${indent}          decoration: InputDecoration(
${indent}            contentPadding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 8.0),
${indent}            border: OutlineInputBorder(
${indent}              borderRadius: BorderRadius.circular(4.0),
${indent}            ),
${indent}            filled: true,
${indent}            fillColor: Colors.white,
${indent}          ),
${indent}          hint: Text('${placeholder}'),
${indent}          isExpanded: true,
${indent}          icon: const Icon(Icons.arrow_drop_down),
${indent}          style: TextStyle(
${indent}            color: ${textColor},
${indent}            fontSize: 16.0,
${indent}          ),
${indent}          onChanged: (String? value) {
${indent}            // Handle dropdown value change
${indent}          },
${indent}          items: [
${itemsCode}${indent}          ],
${indent}        ),
${indent}      ),
${indent}    ],
${indent}  ),
${indent})`;
}

// Export the socket controller and the generateFlutterCode function
const exportedModule = {
  ...socketController,
  generateFlutterCode
};

module.exports = exportedModule;

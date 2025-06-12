# Angular Code Generator

This project includes a powerful Angular code generator that creates responsive, modern Angular 16+ components based on whiteboard designs.

## Features

- **Angular 16+ Compatible**: Uses the latest Angular features including standalone components, signals, and the new control flow syntax.
- **Responsive Design**: All generated interfaces are responsive and work well on mobile, tablet, and desktop.
- **Dark Mode Support**: Includes built-in dark mode toggle with localStorage persistence.
- **Modern Components**: Generates various UI components including:
  - Responsive navigation bar with mobile menu
  - Data tables with CRUD operations
  - Forms with validation
  - Cards with various layouts
  - Buttons with loading states
  - Input fields with error handling

## How to Use

### 1. Design in the Whiteboard

Use the whiteboard interface to design your UI by adding components like:

- `navbar`: Navigation bar with links
- `table`: Data table with headers and rows
- `form`: Form with various field types
- `input`: Individual input fields
- `card`: Card components with headers, content, and optional footers
- `button`: Action buttons with various styles

### 2. Generate Angular Code

Once your design is complete, click the "Generate Angular Code" button in the whiteboard interface. This will:

1. Send your design to the server
2. Process the components
3. Generate Angular HTML, CSS, and TypeScript code
4. Return the code to your browser

### 3. Use the Generated Code

The generated code includes:

- **HTML Template**: Using Angular 16+ control flow syntax (@if, @for, @switch)
- **CSS Styles**: Responsive styles with dark mode support
- **TypeScript Component**: A standalone component with signals, form handling, and component logic

You can copy this code directly into your Angular 16+ project.

## Component Types

### Navbar

```typescript
{
  type: 'navbar',
  // Additional properties can be added
}
```

### Table

```typescript
{
  type: 'table',
  title: 'Users Table',
  // Additional properties can be added
}
```

### Form

```typescript
{
  type: 'form',
  title: 'Contact Form',
  // Additional properties can be added
}
```

### Input

```typescript
{
  type: 'input',
  id: 'email',
  label: 'Email Address',
  inputType: 'email',
  placeholder: 'Enter your email',
  // Additional properties can be added
}
```

### Card

```typescript
{
  type: 'card',
  id: 'card1',
  title: 'Card Title',
  content: 'This is the card content',
  hasFooter: true,
  buttonText: 'Learn More',
  // Additional properties can be added
}
```

### Button

```typescript
{
  type: 'button',
  id: 'submit',
  text: 'Submit',
  variant: 'primary', // 'primary', 'secondary', 'danger'
  // Additional properties can be added
}
```

## Technical Details

The code generator uses a socket-based approach:

1. Client sends component data via socket.io
2. Server processes the components and generates Angular code
3. Server sends the generated code back to the client

The generated code is fully standalone and can be used in any Angular 16+ project.
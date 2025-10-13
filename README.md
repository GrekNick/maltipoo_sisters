# Maltipoo Sisters Game 🐕

A fun platformer game featuring two adorable characters: Sofi and Kiwi! Built with Phaser 3 and Socket.io for multiplayer support.

## Features

- 🎮 Single-player and multiplayer modes
- 👯 Two playable characters: Sofi and Kiwi
- 🏃‍♀️ Smooth animations and platformer mechanics
- 🌐 Real-time multiplayer with automatic character assignment

## Prerequisites

Before running the game, make sure you have [Node.js](https://nodejs.org/) installed on your system (version 14 or higher recommended).

## Installation

1. Clone or download this repository
2. Open a terminal in the project directory
3. Install dependencies:

```bash
npm install
```

## Running the Game

### Single Player Mode

For single-player mode, you only need to run the game client:

```bash
npm run dev
```

This will start the Vite development server. Open your browser and navigate to:
```
http://localhost:5173
```

**Controls:**
- **Move Left:** A or ← (Left Arrow)
- **Move Right:** D or → (Right Arrow)  
- **Jump:** W or ↑ (Up Arrow) or Space
- **Switch Character:** Use the dropdown menu in the top-right corner

### Multiplayer Mode

For multiplayer mode, you need to run both the game server and the client:

#### Step 1: Start the Multiplayer Server

Open a terminal and run:

```bash
npm run server
```

The server will start on port 3000. You should see:
```
Server running on port 3000
```

#### Step 2: Start the Game Client

Open a **second terminal** (keep the server running) and run:

```bash
npm run dev
```

This will start the game client on port 5173.

#### Step 3: Connect Players

1. Open your browser and go to `http://localhost:5173`
2. Open **another browser tab or window** and go to the same URL
3. Each player will be automatically assigned a character (Sofi or Kiwi)
4. Play together in real-time!

**Multiplayer Notes:**
- Character selection is automatic - the first player gets one character, the second player gets the other
- Character switching is disabled in multiplayer mode to prevent conflicts
- Player movements are synchronized in real-time
- Up to 2 players can have unique characters; additional players will share characters

## Building for Production

To create an optimized production build:

```bash
npm run build
```

To preview the production build:

```bash
npm run preview
```

## Game Controls

| Action | Keys |
|--------|------|
| Move Left | A or ← |
| Move Right | D or → |
| Jump | W, ↑, or Space |

## Project Structure

```
maltipoo_sisters/
├── src/
│   └── main.js          # Main game logic and Phaser scenes
├── assests/
│   ├── sofi_sprites/    # Sofi character sprites
│   └── kiwi_sprites/    # Kiwi character sprites
├── index.html           # Game HTML entry point
├── server.js            # Multiplayer server (Socket.io)
├── package.json         # Dependencies and scripts
└── vite.config.js       # Vite configuration
```

## Technologies Used

- **Phaser 3** - Game framework
- **Vite** - Build tool and dev server
- **Socket.io** - Real-time multiplayer communication
- **Express** - Web server for multiplayer

## Troubleshooting

### Port Already in Use

If you get an error that port 3000 or 5173 is already in use:
- For the server: Change the PORT in `server.js`
- For the client: Vite will automatically suggest another port

### Connection Issues in Multiplayer

- Make sure the server is running before starting the client
- Check that both terminals are running simultaneously
- Verify your firewall isn't blocking the connections

### Animation Issues

If animations look laggy:
- Check your browser's performance settings
- Try closing other tabs/applications
- Make sure you're using a modern browser (Chrome, Firefox, Safari, Edge)

## License

See LICENSE file for details.

## Have Fun! 🎉

Enjoy playing with Sofi and Kiwi!

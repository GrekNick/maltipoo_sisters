# Maltipoo Sisters Game 🐕

A fun platformer game featuring two adorable characters: Sofi and Kiwi! Built with Phaser 3.

## Features

- 🎮 Single-player platformer
- 👯 Two playable characters: Sofi and Kiwi
- 🏃‍♀️ Smooth animations and platformer mechanics
- 🌐 Online co-op prototype (parked, opt-in — see [Online Co-op (parked)](#online-co-op-parked))

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

### Online Co-op (parked)

Online co-op is an early prototype that is switched **off** by default while the single-player game is
being built. With the flag off, none of the co-op code (or socket.io) ends up in the bundle.

All co-op code is isolated in:

- `src/coop/CoopSession.js` — client side, loaded only when `VITE_COOP=true`
- `server/coop-server.js` — Socket.IO relay server
- `.env.coop` — enables the flag for `--mode coop`

To try it, you need to run both the game server and the client:

#### Step 1: Start the Co-op Server

Open a terminal and run:

```bash
npm run coop:server
```

The server will start on port 3000. You should see:

```
Server running on port 3000
```

#### Step 2: Start the Game Client with Co-op Enabled

Open a **second terminal** (keep the server running) and run:

```bash
npm run dev:coop
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

| Action     | Keys           |
| ---------- | -------------- |
| Move Left  | A or ←         |
| Move Right | D or →         |
| Jump       | W, ↑, or Space |

## Project Structure

```
maltipoo_sisters/
├── src/
│   ├── main.js          # Main game logic and Phaser scenes
│   ├── characters.js    # Character textures and per-character settings
│   └── coop/            # Online co-op client (parked, behind VITE_COOP)
├── assests/
│   ├── sofi_sprites/    # Sofi character sprites
│   └── kiwi_sprites/    # Kiwi character sprites
├── server/
│   └── coop-server.js   # Online co-op server (Socket.io)
├── index.html           # Game HTML entry point
├── .env.coop            # Enables co-op for `--mode coop`
├── package.json         # Dependencies and scripts
└── vite.config.js       # Vite configuration
```

## Technologies Used

- **Phaser 3** - Game framework
- **Vite** - Build tool and dev server
- **Socket.io** - Real-time communication for the co-op prototype
- **Express** - Web server for the co-op prototype

## Troubleshooting

### Port Already in Use

If you get an error that port 3000 or 5173 is already in use:

- For the co-op server: Set the `PORT` env variable (and `VITE_COOP_SERVER_URL` in `.env.coop` to match)
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

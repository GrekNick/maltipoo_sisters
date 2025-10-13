const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const players = {};

// Helper function to get available character
function getAvailableCharacter() {
    const usedCharacters = Object.values(players).map(p => p.character);
    const characters = ['sofi', 'kiwi'];
    
    // Find first available character
    for (const char of characters) {
        if (!usedCharacters.includes(char)) {
            return char;
        }
    }
    
    // If both are taken, assign randomly (for more than 2 players)
    return characters[Math.floor(Math.random() * characters.length)];
}

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    // Assign a unique character to the new player
    const assignedCharacter = getAvailableCharacter();
    
    // Send existing players to the new player
    socket.emit('currentPlayers', players);
    
    // Send the assigned character to the new player
    socket.emit('characterAssigned', { character: assignedCharacter });

    // Notify all other players about the new player
    socket.broadcast.emit('newPlayer', {
        id: socket.id,
        x: 100,
        y: 400,
        character: assignedCharacter,
        flipX: false,
        animation: 'turn'
    });

    // Add new player to the players object
    players[socket.id] = {
        id: socket.id,
        x: 100,
        y: 400,
        character: assignedCharacter,
        flipX: false,
        animation: 'turn'
    };

    console.log(`Player ${socket.id} assigned character: ${assignedCharacter}`);
    console.log(`Total players: ${Object.keys(players).length}`);

    // Handle player movement updates
    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            players[socket.id].flipX = movementData.flipX;
            players[socket.id].animation = movementData.animation;
            
            // Broadcast to all other players
            socket.broadcast.emit('playerMoved', {
                id: socket.id,
                ...movementData
            });
        }
    });

    // Handle character changes - now blocked in multiplayer
    socket.on('characterChange', (data) => {
        const playerCount = Object.keys(players).length;
        
        // Only allow character change if there's only 1 player (single player mode)
        if (playerCount === 1) {
            if (players[socket.id]) {
                players[socket.id].character = data.character;
                socket.broadcast.emit('playerCharacterChanged', {
                    id: socket.id,
                    character: data.character
                });
            }
        } else {
            // Reject character change in multiplayer mode
            socket.emit('characterChangeRejected', { 
                message: 'Cannot change character in multiplayer mode',
                assignedCharacter: players[socket.id].character
            });
        }
    });

    // Handle player disconnect
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

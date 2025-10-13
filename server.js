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

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    // Send existing players to the new player
    socket.emit('currentPlayers', players);

    // Notify all other players about the new player
    socket.broadcast.emit('newPlayer', {
        id: socket.id,
        x: 100,
        y: 400,
        character: 'sofi',
        flipX: false,
        animation: 'turn'
    });

    // Add new player to the players object
    players[socket.id] = {
        id: socket.id,
        x: 100,
        y: 400,
        character: 'sofi',
        flipX: false,
        animation: 'turn'
    };

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

    // Handle character changes
    socket.on('characterChange', (data) => {
        if (players[socket.id]) {
            players[socket.id].character = data.character;
            socket.broadcast.emit('playerCharacterChanged', {
                id: socket.id,
                character: data.character
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

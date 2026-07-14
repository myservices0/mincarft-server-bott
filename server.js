const express = require('express');
const mineflayer = require('mineflayer');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let activeBots = [];
let targetServer = { ip: '', port: 25565 };
let isRunning = false;

// Function to create a resilient bot
function spawnBot(username) {
    if (!isRunning) return;

    const bot = mineflayer.createBot({
        host: targetServer.ip,
        port: targetServer.port,
        username: username
    });

    // Auto-reconnect if kicked or server restarts
    bot.on('end', (reason) => {
        console.log(`${username} disconnected: ${reason}`);
        // Remove dead bot from array
        activeBots = activeBots.filter(b => b.username !== username);
        
        // Rejoin instantly (with a 5 second delay to prevent Aternos IP-bans)
        if (isRunning) {
            console.log(`Reconnecting ${username} in 5 seconds...`);
            setTimeout(() => spawnBot(username), 5000);
        }
    });

    bot.on('error', (err) => console.log(`${username} Error:`, err));
    
    bot.once('spawn', () => {
        console.log(`${username} joined successfully!`);

        // Anti-AFK Routine
        setInterval(() => {
            // Stop executing if the bot was shut down from the UI
            if (!isRunning || !bot.entity) return; 

            // 1. Look around randomly
            const randomYaw = Math.random() * Math.PI * 2; 
            const randomPitch = (Math.random() * Math.PI) - (Math.PI / 2); 
            bot.look(randomYaw, randomPitch, true);

            // 2. Perform a random physical action
            const actions = ['jump', 'sneak', 'forward', 'left', 'right'];
            const chosenAction = actions[Math.floor(Math.random() * actions.length)];
            
            bot.setControlState(chosenAction, true);
            
            // Release the key after 500 milliseconds so they don't run away
            setTimeout(() => {
                bot.clearControlStates();
            }, 500); 

            // 3. Occasionally swing their arm (50% chance)
            if (Math.random() > 0.5) {
                bot.swingArm();
            }

        }, 15000); // Triggers every 15 seconds
    });

    activeBots.push({ username, instance: bot });
}

// API to start bots
app.post('/api/start', (req, res) => {
    const { ip, port, count } = req.body;
    if (isRunning) return res.status(400).json({ error: "Bots are already running!" });

    targetServer = { ip, port: parseInt(port) };
    isRunning = true;

    for (let i = 1; i <= count; i++) {
        spawnBot(`AFK_Bot_${i}`);
    }
    res.json({ message: `Starting ${count} bots on ${ip}:${port}` });
});

// API to stop bots
app.post('/api/stop', (req, res) => {
    isRunning = false;
    activeBots.forEach(b => b.instance.quit());
    activeBots = [];
    res.json({ message: "All bots shut down." });
});

// API to get bot status for the UI
app.get('/api/status', (req, res) => {
    res.json({
        running: isRunning,
        botCount: activeBots.length,
        server: targetServer.ip
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Web UI running on port ${PORT}`));
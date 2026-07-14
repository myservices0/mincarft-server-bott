const express = require('express');
const mineflayer = require('mineflayer');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let activeBots = [];
let targetServer = { ip: '', port: 25565, version: '1.21.1' };
let isRunning = false;
let serverLogs = [];

function addLog(message) {
    console.log(message);
    serverLogs.unshift(message); // Add to the top
    if (serverLogs.length > 15) serverLogs.pop(); // Keep only the last 15 messages
}

function spawnBot(username) {
    if (!isRunning) return;

    addLog(`⏳ Attempting to connect ${username}...`);

    const bot = mineflayer.createBot({
        host: targetServer.ip,
        port: targetServer.port,
        username: username,
        version: targetServer.version // Forces the exact version
    });

    bot.on('end', (reason) => {
        addLog(`🔴 ${username} disconnected: ${reason}`);
        activeBots = activeBots.filter(b => b.username !== username);
        
        if (isRunning) {
            addLog(`🔄 Reconnecting ${username} in 10 seconds...`);
            setTimeout(() => spawnBot(username), 10000); // 10 second delay prevents IP bans
        }
    });

    bot.on('error', (err) => {
        addLog(`⚠️ ${username} ERROR: ${err.message}`);
    });
    
    bot.once('spawn', () => {
        addLog(`🟢 ${username} spawned in the world!`);

        // Anti-AFK Routine
        setInterval(() => {
            if (!isRunning || !bot.entity) return; 

            // Look around randomly
            const randomYaw = Math.random() * Math.PI * 2; 
            const randomPitch = (Math.random() * Math.PI) - (Math.PI / 2); 
            bot.look(randomYaw, randomPitch, true);

            // Random physical action
            const actions = ['jump', 'sneak', 'forward', 'left', 'right'];
            const chosenAction = actions[Math.floor(Math.random() * actions.length)];
            bot.setControlState(chosenAction, true);
            
            setTimeout(() => bot.clearControlStates(), 500); 

            if (Math.random() > 0.5) bot.swingArm();

        }, 15000); 
    });

    activeBots.push({ username, instance: bot });
}

app.post('/api/start', (req, res) => {
    const { ip, port, count, version } = req.body;
    if (isRunning) return res.status(400).json({ error: "Bots are already running!" });

    targetServer = { ip, port: parseInt(port), version };
    isRunning = true;
    serverLogs = []; // Clear old logs

    addLog(`🚀 Booting up ${count} bots for ${ip} on version ${version}...`);

    for (let i = 1; i <= count; i++) {
        // Stagger bot logins by 3 seconds so Aternos doesn't think it's a DDoS attack
        setTimeout(() => {
            if (isRunning) spawnBot(`AFK_Bot_${i}`);
        }, i * 3000);
    }
    res.json({ message: "Starting sequence initiated." });
});

app.post('/api/stop', (req, res) => {
    isRunning = false;
    addLog("🛑 Shutting down all bots...");
    activeBots.forEach(b => b.instance.quit());
    activeBots = [];
    res.json({ message: "All bots shut down." });
});

app.get('/api/status', (req, res) => {
    res.json({
        running: isRunning,
        botCount: activeBots.length,
        logs: serverLogs
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Web UI running on port ${PORT}`));

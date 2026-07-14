const express = require('express');
const mineflayer = require('mineflayer');
const path = require('path');

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

let activeBots = [];
let isRunning = false;
let serverLogs = [];

const botNames = [
    "ShadowNinja99", "PixelCrafter", "DiamondMinerx", "IronGolemFan", "CreeperHunter", 
    "RedstonePro", "BlockBuilder22", "EnderSlayer", "NetherKing", "GhostSniper"
];

function addLog(message) {
    console.log(message);
    serverLogs.unshift(message);
    if (serverLogs.length > 25) serverLogs.pop();
}

// Stop the server from fully crashing if a bot breaks
process.on('uncaughtException', (err) => {
    addLog(`💥 CRITICAL ERROR: ${err.message}`);
});

function spawnBot(username, ip, port, version) {
    if (!isRunning) return;

    addLog(`⏳ [${username}] Connecting to ${ip}:${port}...`);

    try {
        const bot = mineflayer.createBot({
            host: ip,
            port: port,
            username: username,
            version: version 
        });

        bot.on('end', (reason) => {
            addLog(`🔴 [${username}] Disconnected: ${reason}`);
            activeBots = activeBots.filter(b => b.username !== username);
            
            if (isRunning) {
                addLog(`🔄 [${username}] Reconnecting in 15 seconds...`);
                setTimeout(() => spawnBot(username, ip, port, version), 15000); 
            }
        });

        bot.on('kicked', (reason) => addLog(`👟 [${username}] Kicked: ${reason}`));
        bot.on('error', (err) => addLog(`⚠️ [${username}] Error: ${err.message}`));
        
        bot.once('spawn', () => {
            addLog(`🟢 [${username}] Spawned in the world!`);
            setInterval(() => {
                if (!isRunning || !bot.entity) return; 
                bot.look(Math.random() * Math.PI * 2, 0, true); 
                bot.setControlState('sneak', true);
                setTimeout(() => bot.clearControlStates(), 200); 
            }, 30000); 
        });

        activeBots.push({ username, instance: bot });
    } catch (err) {
        addLog(`⚠️ [${username}] Failed to create bot: ${err.message}`);
    }
}

app.post('/api/start', (req, res) => {
    let { ip, port, count, version } = req.body;
    
    if (isRunning) return res.status(400).json({ error: "Bots are already running!" });

    // FIX: Automatically remove the port from the IP if the user accidentally pastes it in
    if (ip.includes(':')) {
        ip = ip.split(':')[0]; 
    }

    isRunning = true;
    serverLogs = []; 
    addLog(`🚀 Launching ${count} bots to ${ip}:${port}...`);

    for (let i = 0; i < count; i++) {
        const name = botNames[i % botNames.length]; 
        setTimeout(() => {
            if (isRunning) spawnBot(name, ip, parseInt(port), version);
        }, i * 15000); 
    }
    res.json({ message: "Starting sequence initiated." });
});

app.post('/api/stop', (req, res) => {
    isRunning = false;
    addLog("🛑 Shutting down all bots...");
    activeBots.forEach(b => {
        try { b.instance.quit(); } catch(e) {}
    });
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
app.listen(PORT, () => console.log(`Web Dashboard running on port ${PORT}`));

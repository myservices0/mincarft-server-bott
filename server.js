const express = require('express');
const mineflayer = require('mineflayer');
const path = require('path');

const app = express();
app.use(express.json());

// Serve the index.html file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

let activeBots = [];
let isRunning = false;
let serverLogs = [];

// 20 real-looking usernames to pull from
const botNames = [
    "ShadowNinja99", "PixelCrafter", "DiamondMinerx", "IronGolemFan", "CreeperHunter", 
    "RedstonePro", "BlockBuilder22", "EnderSlayer", "NetherKing", "GhostSniper",
    "LavaJumper", "BedWarsPro", "SkyblockKing", "PvpMaster", "WitherKiller",
    "ZombieSlayer", "CaveExplorer", "DirtHutMaker", "NotchFan", "HerobrineHunter"
];

function addLog(message) {
    console.log(message);
    serverLogs.unshift(message);
    if (serverLogs.length > 20) serverLogs.pop();
}

function spawnBot(username, ip, port, version) {
    if (!isRunning) return;

    addLog(`⏳ [${username}] Connecting to ${ip}:${port}...`);

    const bot = mineflayer.createBot({
        host: ip,
        port: port,
        username: username,
        version: version 
    });

    // Reconnect 15 seconds after kick to prevent Aternos "Connection Throttled" error
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
}

app.post('/api/start', (req, res) => {
    const { ip, port, count, version } = req.body;
    if (isRunning) return res.status(400).json({ error: "Bots are already running!" });

    isRunning = true;
    serverLogs = []; 

    addLog(`🚀 Launching ${count} bots to ${ip}:${port}...`);

    for (let i = 0; i < count; i++) {
        const name = botNames[i % botNames.length]; // Cycles names if you request more than 20
        setTimeout(() => {
            if (isRunning) spawnBot(name, ip, parseInt(port), version);
        }, i * 15000); // 15 second delay between logins
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
app.listen(PORT, () => console.log(`Web Dashboard running on port ${PORT}`));
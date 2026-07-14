const express = require('express');
const mineflayer = require('mineflayer');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let activeBots = [];
let targetServer = { ip: '', version: '1.21.1' };
let isRunning = false;
let serverLogs = [];

function addLog(message) {
    console.log(message);
    serverLogs.unshift(message);
    if (serverLogs.length > 20) serverLogs.pop();
}

function spawnBot(username) {
    if (!isRunning) return;

    addLog(`⏳ ${username} is calculating Aternos route...`);

    // Aternos needs the bot to figure out the port automatically. We omit the port to force SRV lookup.
    const bot = mineflayer.createBot({
        host: targetServer.ip,
        username: username,
        version: targetServer.version
    });

    // Exactly 5 seconds auto-reconnect as requested
    bot.on('end', (reason) => {
        addLog(`🔴 ${username} disconnected: ${reason}`);
        activeBots = activeBots.filter(b => b.username !== username);
        
        if (isRunning) {
            addLog(`🔄 Reconnecting ${username} in 5 seconds...`);
            setTimeout(() => spawnBot(username), 5000); 
        }
    });

    bot.on('kicked', (reason) => addLog(`👟 ${username} got kicked: ${reason}`));
    bot.on('error', (err) => addLog(`⚠️ ${username} ERROR: ${err.message}`));
    
    bot.once('spawn', () => {
        addLog(`🟢 ${username} successfully joined the server!`);

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

        }, 15000); // Fidgets every 15 seconds
    });

    activeBots.push({ username, instance: bot });
}

app.post('/api/start', (req, res) => {
    const { ip, count, version } = req.body;
    if (isRunning) return res.status(400).json({ error: "Bots are already running!" });

    targetServer = { ip, version };
    isRunning = true;
    serverLogs = []; 

    addLog(`🚀 Launching ${count} bots to ${ip} (Version ${version})...`);

    // Loops through and adds as many bots as you requested in the UI
    for (let i = 1; i <= count; i++) {
        // Space them out by 5 seconds so Aternos doesn't trigger anti-DDoS
        setTimeout(() => {
            if (isRunning) spawnBot(`AFK_Bot_${i}`);
        }, i * 5000);
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

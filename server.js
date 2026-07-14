const express = require('express');
const mineflayer = require('mineflayer');
const app = express();

app.use(express.json());

// This serves your custom Dashboard layout directly from the code!
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Aternos Bot Manager</title>
        <style>
            body { font-family: Arial, sans-serif; background: #1e1e2e; color: #cdd6f4; text-align: center; padding: 20px; }
            .card { background: #313244; padding: 30px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 10px rgba(0,0,0,0.5); width: 100%; max-width: 450px; }
            input { margin: 10px 0; padding: 10px; width: 90%; border-radius: 5px; border: none; background: #45475a; color: white; box-sizing: border-box; font-size: 16px;}
            button { padding: 12px 20px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; margin: 10px 5px; width: 45%; font-size: 16px; transition: 0.2s;}
            button:hover { opacity: 0.8; }
            .start-btn { background: #a6e3a1; color: #1e1e2e; }
            .stop-btn { background: #f38ba8; color: #1e1e2e; }
            #status-box { margin-top: 20px; font-weight: bold; color: #89b4fa; font-size: 1.2em; }
            .terminal { background: #11111b; color: #a6adc8; padding: 15px; margin-top: 20px; border-radius: 5px; text-align: left; height: 250px; overflow-y: auto; font-family: monospace; font-size: 0.9em; border: 1px solid #45475a;}
        </style>
    </head>
    <body>
        <div class="card">
            <h2>Aternos Bot Dashboard</h2>
            <input type="text" id="ip" placeholder="Aternos IP (e.g. watersmp-Og8t.aternos.me)" value="watersmp-Og8t.aternos.me">
            <input type="number" id="port" placeholder="Port (e.g. 48082)" value="48082">
            <input type="text" id="version" placeholder="Minecraft Version" value="1.21.1">
            <input type="number" id="count" placeholder="How many bots?" value="10">
            <br>
            <button class="start-btn" onclick="startBots()">Start Bots</button>
            <button class="stop-btn" onclick="stopBots()">Stop All</button>
            
            <div id="status-box">Checking status...</div>
            <div class="terminal" id="log-box">Waiting for logs...</div>
        </div>

        <script>
            async function fetchStatus() {
                try {
                    const res = await fetch('/api/status');
                    const data = await res.json();
                    const statusBox = document.getElementById('status-box');
                    if (data.running) {
                        statusBox.innerHTML = '🟢 ONLINE: ' + data.botCount + ' bots active';
                    } else {
                        statusBox.innerHTML = '🔴 OFFLINE';
                    }
                    document.getElementById('log-box').innerHTML = data.logs.join('<br>') || "Waiting for logs...";
                } catch (err) {
                    document.getElementById('status-box').innerHTML = '🔴 CONNECTION TO HOST LOST';
                }
            }

            async function startBots() {
                const ip = document.getElementById('ip').value.trim();
                const port = document.getElementById('port').value.trim();
                const version = document.getElementById('version').value.trim();
                const count = document.getElementById('count').value;
                if (!ip || !port) { alert("Enter both IP and Port!"); return; }
                await fetch('/api/start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ip, port, count, version })
                });
                fetchStatus();
            }

            async function stopBots() {
                await fetch('/api/stop', { method: 'POST' });
                fetchStatus();
            }

            setInterval(fetchStatus, 2000);
            fetchStatus();
        </script>
    </body>
    </html>
    `);
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
    if (serverLogs.length > 20) serverLogs.pop();
}

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
            version: version,
            viewDistance: 'tiny' // Saves ram in the cloud
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
            addLog(`🟢 [${username}] ACTUALLY JOINED THE WORLD!`);
            bot.physicsEnabled = false; // Saves cloud server cpu

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

    isRunning = true;
    serverLogs = []; 
    addLog(`🚀 Launching ${count} bots to ${ip}:${port}...`);

    for (let i = 0; i < Math.min(count, 10); i++) {
        const name = botNames[i]; 
        setTimeout(() => {
            if (isRunning) spawnBot(name, ip, parseInt(port), version);
        }, i * 15000); // 15-second delay protects against Aternos throttle bans
    }
    res.json({ message: "Starting sequence initiated." });
});

app.post('/api/stop', (req, res) => {
    isRunning = false;
    addLog("🛑 Shutting down all bots...");
    activeBots.forEach(b => { try { b.instance.quit(); } catch(e) {} });
    activeBots = [];
    res.json({ message: "All bots shut down." });
});

app.get('/api/status', (req, res) => {
    res.json({ running: isRunning, botCount: activeBots.length, logs: serverLogs });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Web UI running on port ${PORT}`));

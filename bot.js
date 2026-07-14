const mineflayer = require('mineflayer');
const http = require('http');

// === CLOUD HOST LIFESAVER ===
// Free hosts will kill the bot if it doesn't open a web port. This keeps it alive!
const webPort = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Minecraft Bots are currently running 24/7!');
}).listen(webPort, () => console.log(`Dummy web server running on port ${webPort}`));
// ============================

// === SERVER SETTINGS ===
const SERVER_IP = 'watersmp-Og8t.aternos.me'; 
const SERVER_PORT = 48082;                
const VERSION = '1.21.1'; // ViaVersion will translate this into 26.1.2 for the server
// =======================

// 10 real-looking usernames
const botNames = [
    "ShadowNinja99", "PixelCrafter", "DiamondMinerx", 
    "IronGolemFan", "CreeperHunter", "RedstonePro",
    "BlockBuilder22", "EnderSlayer", "NetherKing", "GhostSniper"
];

function spawnBot(username) {
    console.log(`[${username}] Connecting to ${SERVER_IP}:${SERVER_PORT}...`);

    const bot = mineflayer.createBot({
        host: SERVER_IP,
        port: SERVER_PORT,
        username: username,
        version: VERSION
    });

    // Rejoin 15 seconds after getting kicked to completely bypass Aternos "Connection throttled"
    bot.on('end', (reason) => {
        console.log(`🔴 [${username}] Disconnected: ${reason}`);
        console.log(`🔄 [${username}] Reconnecting in 15 seconds...`);
        setTimeout(() => spawnBot(username), 15000);
    });

    bot.on('kicked', (reason) => console.log(`👟 [${username}] Kicked: ${reason}`));
    bot.on('error', (err) => console.log(`⚠️ [${username}] Error: ${err.message}`));

    bot.once('spawn', () => {
        console.log(`🟢 [${username}] ACTUALLY JOINED THE WORLD!`);

        // They will just sit there AFK. 
        // We only move their head every 30 seconds so Aternos doesn't kick them for freezing.
        setInterval(() => {
            if (!bot.entity) return;
            const randomYaw = Math.random() * Math.PI * 2;
            bot.look(randomYaw, 0, true); // Look left or right
            
            // Tap the crouch button once to register as an active player
            bot.setControlState('sneak', true);
            setTimeout(() => bot.clearControlStates(), 200);
        }, 30000); 
    });
}

// Start the 10 bots!
// We wait 15 seconds between each bot logging in to prevent Aternos throttling.
console.log("Starting bot launch sequence...");

for (let i = 0; i < botNames.length; i++) {
    setTimeout(() => {
        spawnBot(botNames[i]);
    }, i * 15000); 
}

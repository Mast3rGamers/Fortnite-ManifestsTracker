const discord = require("discord.js");

const config = require("./config.json");
const tracker = require("./tracker");

const client = new discord.WebhookClient({id: config.id, token: config.token});

(()=>{
    console.log("FortniteManifestTracker.js\n==Made by: @Mast3rGamers on GitHub\n\n");
    return tracker.startTracker(client);
})();
const async = require("async");
const axios = require("axios");
const discord = require("discord.js");
const request = require("request-promise");

const utils = require("../utils");

const manifests = require("./manifests.json");

const aliveManifestsMap = new Map();
const baseManifestDownloadUrl = "https://raw.githubusercontent.com/polynite/fn-releases/master/manifests/";
var currentManifestIndex = 0;
const chunksMap = new Map();
const MAX_CONCURRENT_REQUESTS = 4;

const chunkRequest = async (url, client) => {
    if (!url) return;
    try {
        const {status} = await axios.head(url);
        return status;
    } catch (err) {
        try {
            return err.response.status;
        } catch (error) {
            client.send({content: `ERROR!\n\n${error}`});
        }
    }
};

const tracker = async (client)=>{
    return new Promise(async (resolve) => {
        try {
            const jsonKeys = Object.keys(manifests.manifests);

            const manifestsTotalIndex = jsonKeys.length;
            console.log({manifestsTotalIndex});

            if (currentManifestIndex == manifestsTotalIndex) {
                currentManifestIndex = 0;
            }

            const currentBuildName = jsonKeys[currentManifestIndex];
            console.log({currentBuildName});
            const currentManifestName = manifests.manifests[currentBuildName];
            console.log({currentManifestName});

            currentManifestIndex += 1;

            client.send({content: `Checking ${currentBuildName} manifest chunks...`});
            if (aliveManifestsMap.get(currentManifestName)) {
                client.send({content: "Skipping check because build is fully alive."});
                return resolve();
            }

            const finalManifestDownloadUrl = `${baseManifestDownloadUrl}${currentManifestName}`;
            const manifest = await request({
                url: `${finalManifestDownloadUrl}`,
                method: "GET",
                json: true
            });

            var aliveChunks = 0;

            const chunkGUIDs = Object.keys(manifest.ChunkHashList);
            const currentTotalChunks = chunkGUIDs.length;
            console.log({currentTotalChunks});

            await async.forEachLimit(chunkGUIDs, MAX_CONCURRENT_REQUESTS, async (chunkGUID) => {
                const unpackedHash = utils.returnFinalHash(manifest.ChunkHashList[chunkGUID]);
                console.log({unpackedHash});
                const finalChunkDownloadUrl = `https://epicgames-download1.akamaized.net/Builds/Fortnite/CloudDir/ChunksV3/${manifest.DataGroupList[chunkGUID].substr(1)}/${unpackedHash}_${chunkGUID}.chunk`;
                var chunkStatus = await chunkRequest(finalChunkDownloadUrl, client);
                console.log({chunkStatus});
                if (chunkStatus == 200) aliveChunks += 1;
            });
            console.log({aliveChunks});

            const prevAliveChunks = chunksMap.get(currentBuildName);
            if (aliveChunks == currentTotalChunks) {
                console.log(`ALL THE CHUNKS ARE ALIVE FOR ${currentBuildName}`);

                const embed = new discord.EmbedBuilder({
                    title: `ALL THE CHUNKS FOR ${currentBuildName} ARE UP`,
                    description: `All the chunks for the manifest are up.\nManifest: ${currentManifestName}\n[**Download Manifest**](${finalManifestDownloadUrl})`,
                    color: 0x93FA00
                })
                .addFields(
                    {name: "**Alive Chunks**", value: `${aliveChunks}`, inline: true},
                    {name: "**Total Chunks**", value: `${currentTotalChunks}`, inline: true}
                )
                .setTimestamp()
                .setFooter({text: "Created by MasterGamers (GitHub: Mast3rGamers)"});

                client.send({
                    content: "@everyone",
                    embeds: [embed]
                });

                chunksMap.set(currentBuildName, aliveChunks);
                aliveManifestsMap.set(currentManifestName, "alive");

                return resolve();
            } else if (prevAliveChunks !== aliveChunks) {
                console.log("ALIVE CHUNKS DIFFERENCE");

                const embed = new discord.EmbedBuilder({
                    title: `ALIVE CHUNKS DIFFERENCE ON ${currentBuildName}`,
                    description: `Alive chunks value has changed, there are more, or less alive chunks for the manifest.`,
                    color: 0xE66C1C
                })
                .addFields(
                    {name: "**Previously Alive Chunks**", value: `~~${prevAliveChunks}~~`, inline: true},
                    {name: "**Alive Chunks**", value: `${aliveChunks}`, inline: true},
                    {name: "**Total Chunks**", value: `${currentTotalChunks}`, inline: true}
                )
                .setTimestamp()
                .setFooter({text: "Created by MasterGamers (GitHub: Mast3rGamers)"});

                client.send({embeds:[embed]});

                chunksMap.set(currentBuildName, aliveChunks);

                return resolve();
            }

            chunksMap.set(currentBuildName, aliveChunks);

            const embed = new discord.EmbedBuilder({
                title: `${currentBuildName} stats.`
            })
            .addFields(
                {name: "**Alive Chunks**", value: `${aliveChunks}`, inline: true},
                {name: "**Total Chunks**", value: `${currentTotalChunks}`, inline: true}
            )
            .setTimestamp()
            .setFooter({text: "Created by MasterGamers (GitHub: Mast3rGamers)"});
            client.send({embeds:[embed]});
            resolve();
        } catch(error) {
            client.send({content: `ERROR!\n\n${error}`});
            resolve();
        }
    });
}

module.exports = {
    startTracker: async (client)=>{
        if (!client) return;

        await client.send({content: "Started tracker :white_check_mark:"});

        while (true) {
            await tracker(client);
        };
    }
}

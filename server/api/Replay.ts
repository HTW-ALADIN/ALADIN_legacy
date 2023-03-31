import { Router } from "express";
import { Channel } from "amqplib";
const fs = require("fs");
const path = require("path");

// from https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
const makeHash = (string: string) => {
    var hash = 0,
        i,
        chr;
    if (string.length === 0) return hash;
    for (i = 0; i < string.length; i++) {
        chr = string.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0;
    }
    return Math.abs(hash);
};

const dir = `${__dirname}/../tempReplayStorage/`;

export const replayRoutes = (router: Router, channel: Channel) => {
    router.post("/storeReplay", async (req, res) => {
        try {
            const { replay } = req.body;
            const id = makeHash(replay);
            const filePath = path.resolve(dir, `${id}.json`);
            fs.writeFileSync(`${filePath}`, replay);

            res.status(200).json(JSON.stringify({ id }));
        } catch (error) {
            res.status(400).json(JSON.stringify(error));
        }
    });

    router.post("/fetchReplayOverview", async (req, res) => {
        try {
            const user = req.body;
            const replayList = fs
                .readdirSync(dir)
                .map((fileName: string) => {
                    const filePath = path.resolve(dir, fileName);
                    const replay = JSON.parse(fs.readFileSync(`${filePath}`).toString());
                    const meta = replay.meta;
                    meta["hash"] = fileName.split(".")[0];
                    return meta;
                })
                .sort((r1: { date: string }, r2: { date: string }) => Number(new Date(r2.date)) - Number(new Date(r1.date)));

            res.status(200).json(JSON.stringify({ replayList }));
        } catch (error) {
            res.status(400).json(JSON.stringify(error));
        }
    });

    router.post("/fetchReplay", async (req, res) => {
        try {
            const { id } = req.body;
            const filePath = path.resolve(dir, `${id}.json`);
            const replay = fs.readFileSync(`${filePath}`).toString();

            res.status(200).json(JSON.stringify({ replay }));
        } catch (error) {
            res.status(400).json(JSON.stringify(error));
        }
    });

    return router;
};

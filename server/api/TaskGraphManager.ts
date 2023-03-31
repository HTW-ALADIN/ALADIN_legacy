const fs = require("fs");
const path = require("path");
import { Router } from "express";

function readTasks(dir: string) {
    const tasks: { [key: string]: { API: object; Worker: object; UI: { [key: string]: object }; name: string } } = {};
    fs.readdirSync(dir).forEach((filename: string) => {
        const name: string = path.parse(filename).name.toLowerCase();
        const filepath = path.resolve(dir, filename);
        const task: { API: object; Worker: object; UI: { [key: string]: object }; name: string } = JSON.parse(fs.readFileSync(filepath));
        task["name"] = path.parse(filename).name;
        tasks[name] = task;
    });
    return tasks;
}

const tasks: { [key: string]: { API: object; Worker: object; UI: { [key: string]: any }; name: string } } = readTasks(
    `${__dirname}/../tempTaskGraphStorage/tasks`
);

export const taskParts = Object.entries(tasks).reduce(
    (taskParts, [name, task]) => {
        const api = task.API as Array<any>;
        taskParts.API = [...taskParts.API, ...api];
        taskParts.Worker = { ...taskParts.Worker, ...task.Worker };
        return taskParts;
    },
    {
        API: [],
        Worker: [],
    } as unknown as { API: any[]; Worker: object }
);

export const taskGraph = (router: Router) => {
    router.post("/fetchTaskGraph", async (req, res) => {
        try {
            const task = req.body.task.toLowerCase();
            res.status(200).json(JSON.stringify(tasks[task]));
        } catch (error) {
            res.status(400).json(JSON.stringify(error));
        }
    });

    router.get("/fetchTasklist", async (req, res) => {
        try {
            const names = Object.values(tasks).map((task) => task.name);
            res.status(200).json(JSON.stringify(names));
        } catch (error) {
            res.status(400).json(JSON.stringify(error));
        }
    });

    router.post("/fetchWorkerConfig", async (req, res) => {
        try {
            const workerConfigs = taskParts.Worker;
            res.status(200).json(JSON.stringify(workerConfigs));
        } catch (error) {
            res.status(400).json(JSON.stringify(error));
        }
    });

    return router;
};

import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { BrokerConnection } from "rabbitmq-rpc-wrapper";
import { TaskRouteManager, ISerializedTaskRoute } from "./api/TaskRouteManager";
import { taskParts } from "./api/TaskGraphManager";
import amqp, { Channel } from "amqplib";

// load environment variables
import * as dotenv from "dotenv";
dotenv.config({ path: __dirname + "/.env" });

const app: express.Application = express();
// const broker = new BrokerConnection("amqp://guest:guest@rabbitmq:5672" || process.env.AMQP_BROKER);

import fs from "fs";
import path from "path";

// var opts = {
// 	cert: fs.readFileSync(path.resolve(__dirname, "./cert/server.pem")),
// 	key: fs.readFileSync(path.resolve(__dirname, "./cert/key.pem")),
// 	ca: [fs.readFileSync(path.resolve(__dirname, "./cert/rootca.pem"))],
// 	rejectUnauthorized: false,
// };

const asyncSleep = async (fn: Function, timeOut: number = 2000): Promise<any> => {
	return new Promise((resolve) => {
		setTimeout(() => resolve(fn()), timeOut);
	});
};
let retries = 50;
const establishBrokerConnection = async (): Promise<{ connection: any; channel: Channel }> => {
	let connection;
	let channel: Channel;
	try {
		connection = await amqp.connect("amqp://guest:guest@rabbitmq:5672"); //process.env.brokerConnection
		channel = await connection.createChannel();
	} catch (error) {
		if (retries) {
			retries--;
			return await asyncSleep(establishBrokerConnection);
		} else {
			throw new Error(error);
		}
	}

	return { connection, channel };
};

const serializedRoutes: Array<ISerializedTaskRoute> = taskParts.API;

(async () => {
	try {
		const port: string = process.env.PORT || "8000";

		app.use(cors());
		app.use(bodyParser.json({ limit: "50mb" }));
		app.use(
			bodyParser.urlencoded({
				limit: "50mb",
				extended: true,
				parameterLimit: 50000,
			})
		);

		// initialize API
		const { channel } = await establishBrokerConnection();
		const taskRouteManager = new TaskRouteManager(app, channel);
		taskRouteManager.addRoute(serializedRoutes);

		const { dbRoutes } = await import("./api/DB");
		const { maximaRoutes } = await import("./api/Maxima");
		const { taskGraph } = await import("./api/taskGraphManager");
		const { replayRoutes } = await import("./api/Replay");
		app.use("/api", dbRoutes(express.Router(), channel));
		app.use("/api", maximaRoutes(express.Router(), channel));
		app.use("/api", taskGraph(express.Router()));
		app.use("/api", replayRoutes(express.Router(), channel));

		const buildResourcesPath = `${__dirname}/public/`;
		app.use(express.static(buildResourcesPath));

		app.get("/", (req: express.Request, res: express.Response) => {
			res.sendFile(`${buildResourcesPath}index.html`);
		});

		app.listen(port, () => {
			// tslint:disable-next-line:no-console
			console.log(`server started at http://localhost:${port}`);
		});
	} catch (error) {
		throw Error(error);
	} finally {
		// const cleanup = () => broker.tearDown();
		// [`exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`].forEach((eventType) => {
		//     process.on(eventType, cleanup.bind(null, eventType));
		// });
	}
})();

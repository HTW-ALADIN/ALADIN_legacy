import express from "express";
import path from "path";
import { TaskRouteManager, ISerializedTaskRoute } from "./api/TaskRouteManager";
import { taskParts } from "./api/TaskGraphManager";
import amqp, { Channel } from "amqplib";

// load environment variables
import * as dotenv from "dotenv";
dotenv.config({ path: __dirname + "/.env" });

// Require Provider
const lti = require("ltijs").Provider;

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
		connection = await amqp.connect("amqp://guest:guest@rabbitmq_:5672"); //process.env.brokerConnection
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
		// Setup
		lti.setup(
			process.env.LTI_KEY,
			{
				url: "mongodb://" + process.env.DB_HOST + "/" + process.env.DB_NAME + "?authSource=admin",
				connection: { user: process.env.DB_USER, pass: process.env.DB_PASS },
			},
			{
				staticPath: path.join(__dirname, "./public"), // Path to static files
				cookies: {
					secure: false, // Set secure to true if the testing platform is in a different domain and https is being used
					sameSite: "", // Set sameSite to 'None' if the testing platform is in a different domain and https is being used
				},
				devMode: true, // Set DevMode to true if the testing platform is in a different domain and https is not being used
			}
		);

		const buildResourcesPath = `${__dirname}/public/`;
		lti.app.use(express.static(buildResourcesPath));

		lti.app.get("/", (req: express.Request, res: express.Response) => {
			res.sendFile(`${buildResourcesPath}index.html`);
		});

		// When receiving successful LTI launch redirects to app
		lti.onConnect(async (token: string, req: express.Request, res: express.Response) => {
			return res.sendFile(path.join(__dirname, "./public/index.html"));
		});

		// When receiving deep linking request redirects to deep screen
		lti.onDeepLinking(async (token: string, req: express.Request, res: express.Response) => {
			return lti.redirect(res, "/deeplink", { newResource: true });
		});

		// // Setting up routes
		// lti.app.use(routes);

		// initialize API
		const { channel } = await establishBrokerConnection();
		const taskRouteManager = new TaskRouteManager(lti.app, channel);
		taskRouteManager.addRoute(serializedRoutes);

		const { dbRoutes } = await import("./api/DB");
		const { maximaRoutes } = await import("./api/Maxima");
		const { taskGraph } = await import("./api/taskGraphManager");
		const { replayRoutes } = await import("./api/Replay");
		lti.app.use("/api", dbRoutes(express.Router(), channel));
		lti.app.use("/api", maximaRoutes(express.Router(), channel));
		lti.app.use("/api", taskGraph(express.Router()));
		lti.app.use("/api", replayRoutes(express.Router(), channel));

		const { LTIRoutes } = await import("./api/LTI");
		lti.app.use("/api", LTIRoutes(express.Router()));

		// Setup function
		const setup = async () => {
			await lti.deploy({ port: process.env.PORT }); // 3000

			/**
			 * Register platform
			 */
			await lti.registerPlatform({
				url: "http://bildungsportal.sachsen.de/opal",
				name: "myolat",
				clientId: "CLIENTID",
				authenticationEndpoint: "http://localhost/moodle/mod/lti/auth.php",
				accesstokenEndpoint: "http://localhost/moodle/mod/lti/token.php",
				authConfig: { method: "JWK_SET", key: "http://localhost/moodle/mod/lti/certs.php" },
			});
		};

		setup();
	} catch (error) {
		throw Error(error);
	} finally {
		// const cleanup = () => broker.tearDown();
		// [`exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`].forEach((eventType) => {
		//     process.on(eventType, cleanup.bind(null, eventType));
		// });
	}
})();

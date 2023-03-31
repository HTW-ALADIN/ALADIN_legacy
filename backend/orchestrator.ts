import { RPCConsumer } from "rabbitmq-rpc-wrapper";
import amqp, { Channel } from "amqplib";
import { GozintographTaskGenerator } from "./Tasks/gozintograph/Task";
import { sqlQueryGenerator, sqlQueryValidator, importDatabase, fetchERD } from "./Tasks/SQL/SQLTaskWorker";
import { semanticSqlQueryGenerator } from "./Tasks/SQL/semanticSQLWorker/SQLTaskGenerator";
import { semanticSqlQueryValidator } from "./Tasks/SQL/semanticSQLWorker/SQLValidator";
import { InterpolationTaskGenerator } from "./Tasks/geoInterpolation/GeoInterpolationWorker";
import { ShortestPathTaskGenerator } from "./Tasks/shortestPath/MunkeltWorker";
import { PostgresWorker } from "./workers/PostgresWorker";
import { EPKTaskGenerator } from "./Tasks/EPK/EPKTask";
import { SchedulingTaskGenerator } from "./Tasks/scheduling/Task";
import { PgClient } from "./database/postgres/postgresDAO";
import { MinioClientWrapper } from "./database/minio/minioDAO";
import axios from "axios";

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

// TODO generalize generators into serialisable functions
const generators: { [key: string]: any } = {
	GozintographTaskGenerator: GozintographTaskGenerator,
	sqlQueryGenerator: sqlQueryGenerator,
	sqlQueryValidator: sqlQueryValidator,
	importDatabase: importDatabase,
	fetchERD: fetchERD,
	semanticSqlQueryGenerator: semanticSqlQueryGenerator,
	semanticSqlQueryValidator: semanticSqlQueryValidator,
	InterpolationTaskGenerator: InterpolationTaskGenerator,
	ShortestPathTaskGenerator: ShortestPathTaskGenerator,
	EPKTaskGenerator: EPKTaskGenerator,
	SchedulingTaskGenerator: SchedulingTaskGenerator,
};

// load environment variables
import * as dotenv from "dotenv";
dotenv.config({ path: __dirname + "/.env" });

interface ISerializedQueues {
	[key: string]: {
		minConsumers: number;
		consumerInstructions: {
			[key: string]: {
				dependencies: Array<string>;
				body: string;
			};
		};
	};
}

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

(async () => {
	try {
		// start rabbitmq
		const { channel } = await establishBrokerConnection();

		// initialize db
		// Set up mongoDB
		// const mdb = await require("./database/mongodb/mongooseDAO")();

		// initialize minio
		// const minioClient = new MinioClientWrapper();

		// initialize postgres
		const dbName = "aladin";
		const aladinClient = new PgClient(dbName);
		const pgWorker = PostgresWorker(aladinClient, channel, dbName);

		// initialize maxima via docker-compose up maxima
		// const maximaWorker = MaximaWorker(channel);

		// initialize rabbitmq consumers
		// TODO generalize with supervisor and docker api
		// https://docs.docker.com/engine/api/v1.40/#operation/ContainerLogs
		// https://stackoverflow.com/questions/37581644/start-docker-container-from-another-application-in-another-docker-container

		// template and configure dockerfiles https://www.datanovia.com/en/courses/docker-compose-wait-for-dependencies/
		const response = await asyncSleep(
			async () => await axios.post(`http://reverse-proxy:3000/api/fetchWorkerConfig`, {})
		);
		const queues: ISerializedQueues = JSON.parse(response.data);

		for (let queue in queues) {
			const queueConfig = queues[queue];
			// forbidden black magic:
			// https://stackoverflow.com/questions/36517173/how-to-store-a-javascript-function-in-json
			// https://stackoverflow.com/questions/6396046/unlimited-arguments-in-a-javascript-function
			const parsedFunctions = Object.entries(queueConfig.consumerInstructions).reduce(
				(parsedFunctions, [instructionName, instruction]) => {
					const parsedFunction = new AsyncFunction(
						...instruction.dependencies.map((dependency) => generators[dependency].name),
						`"use strict"; return (${instruction.body});`
					)(...instruction.dependencies.map((dependency) => generators[dependency]));
					return { ...parsedFunctions, [instructionName]: parsedFunction };
				},
				{}
			);

			const consumer = new RPCConsumer(channel, queue, parsedFunctions);
			consumer.startConsuming();
		}
	} catch (error) {
		console.log(error);
	} finally {
		console.log("backend booted");
	}
})();

import { RPCConsumer } from "rabbitmq-rpc-wrapper";
import { Channel } from "amqplib";
import * as amqp from "amqplib";
import { spawn } from "child_process";
import { MaximaInputParser } from "./MaximaInputParser";
import { MaximaOutputParser } from "./MaximaOutputParser";
import { MaximaOperations } from "./MaximaWrapper";

const inputParser = new MaximaInputParser();
const outputParser = new MaximaOutputParser();

interface IMaximaInstruction {
    instruction: string;
    parameters: {
        operands: { [key: string]: any };
        operations: { [key: number]: { operands: Array<number>; operation: keyof typeof MaximaOperations } };
        type: keyof MaximaInputParser;
    };
}

export const MaximaWorker = async (channel: Channel): Promise<RPCConsumer> => {
    const consumer = new RPCConsumer(channel, `Maxima`, { query: processQuery });
    consumer.startConsuming();
    return consumer;
};

const processQuery = async (instruction: IMaximaInstruction) => {
    const { operands, operations, type } = instruction.parameters;
    const parsedOperands = Object.entries(operands).reduce<{ [key: string]: any }>((parsed, [key, operand]) => {
        parsed[key] = inputParser.parse({ object: operand, type });
        return parsed;
    }, {});

    const parsedQuery =
        Object.entries(operations).reduce((parsedInstruction, [key, instruction]) => {
            const { operands, operation } = instruction;
            const selectedOperands = operands.map((key) => parsedOperands[key]).reverse();
            parsedInstruction += MaximaOperations[operation](...selectedOperands);
            return parsedInstruction;
        }, "") + ";";

    const result: Array<string> = await spawnMaxima(parsedQuery);
    console.log(result);
    const parsedOutput = outputParser.parse({ type, output: result });
    console.log(parsedOutput);
    return parsedOutput;
};

const spawnMaxima = async (input: string): Promise<Array<string>> => {
    return await new Promise((resolve, reject) => {
        var maxima = spawn("stdbuf", ["-i0", "-o0", "-e0", "maxima"]);
        let output: Array<string> = [];
        const teardown = () => {
            maxima.stdin.end();
            maxima.stdout.pause();
            maxima.kill();
        };

        maxima.stdout.setEncoding("utf8");
        maxima.stdout.on("data", (data) => {
            const outputStarted = /%i1/.test(data);
            const outputFinished = /%i2/.test(data);
            if (outputStarted || output.length) output.push(data);
            if (outputFinished) {
                resolve(output);
                teardown();
            }
        });
        maxima.stderr.on("data", (e) => {
            if (e == false) {
                reject(e);
                teardown();
            }
        });
        maxima.stdin.write(input);
    });
};

// connect to rabbitmq
(async () => {
    const connection = await amqp.connect("amqp://guest:guest@rabbitmq:5672"); //process.env.brokerConnection
    const channel: Channel = await connection.createChannel();
    MaximaWorker(channel);
})();

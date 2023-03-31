import { Request, Response, Application } from "express";
import { Channel } from "amqplib";
import { RPCProducer } from "rabbitmq-rpc-wrapper";

export type HTTPMethod = "get" | "post" | "put" | "delete";

export type JSONTypes = "string" | "number" | "boolean" | "array" | "object" | "null";

export interface ITaskParameters {
    [key: string]: JSONTypes | Array<JSONTypes> | ITaskParameters;
}

export interface ISerializedTaskRoute {
    task: string;
    name: string;
    httpMethod: HTTPMethod;
    callback?: Function;
    params?: ITaskParameters;
}

const introspectType = (value: any): string => {
    const regex = /^[object (S+?)]$/;
    const matches = Object.prototype.toString.call(value).match(regex) || [];

    return (matches[1] || "undefined").toLowerCase();
};

export class TaskRouteManager {
    constructor(private api: Application, private channel: Channel) {}

    public addRoute(routes: Array<ISerializedTaskRoute>) {
        routes.forEach((route) => {
            this.api[route.httpMethod](`/api/${route.task}/${route.name}`, (req, res, next) => this.requestHandler(req, res, route));
        });
    }

    public deleteRoute(routes: { [key in HTTPMethod]: Array<string> }) {
        Object.entries(routes).forEach(([httpMethod, names]) => {
            this.api.routes[httpMethod] = this.api.routes[httpMethod].filter((route: any) => !names.includes(route.path));
        });
    }

    private async requestHandler(req: Request, res: Response, serializedRoute: ISerializedTaskRoute) {
        const { params, task } = serializedRoute;
        // console.log(this.validateParameters(req, params));
        const parsedParameters = params ? this.validateParameters(req, params) : {};
        if (parsedParameters.error) {
            res.status(400).json(
                JSON.stringify({
                    error: `Type mismatch at: ${parsedParameters.result}\n Request parameters must have the following shape: ${params}`,
                })
            );
        }

        let producer = null;
        try {
            const configurationObject = { ...req.body, type: task };
            producer = new RPCProducer(this.channel, `${task}Task`, configurationObject);
            const response = await producer.produceTask();
            res.status(200).json(JSON.stringify(response));
        } catch (error) {
            res.status(504).json(JSON.stringify(error));
        } finally {
            if (producer) producer.teardown();
        }
    }

    private validateParameters(req: Request, params: ITaskParameters): { [key: string]: any } {
        const paramIdentifier = req.method === "GET" ? "params" : "body";

        const mismatchedTypes = Object.entries(params).filter(([name, type]) => {
            return introspectType(req[paramIdentifier][name]) !== type;
        });
        return { error: false, result: mismatchedTypes };
    }
}

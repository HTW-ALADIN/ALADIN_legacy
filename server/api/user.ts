import { Router } from "express";
import { Channel } from "amqplib";
import { RPCProducer } from "rabbitmq-rpc-wrapper";

export const userRoutes = (router: Router, channel: Channel) => {
    router.get("/getLanguage", async (req, res) => {
        try {
            const configurationObject = { ...req.body, type: "" };
            const Producer = new RPCProducer(channel, "queue", configurationObject);
            const response = await Producer.produceTask();
            res.status(200).json(JSON.stringify(response));
        } catch (error) {
            res.status(400).json(JSON.stringify(error));
        }
    });

    return router;
};

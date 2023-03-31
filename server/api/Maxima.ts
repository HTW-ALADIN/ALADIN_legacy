import { Router } from "express";
import { Channel } from "amqplib";
import { RPCProducer, IInstructionConfiguration } from "rabbitmq-rpc-wrapper";

export const maximaRoutes = (router: Router, channel: Channel) => {
    router.post("/queryMaxima", async (req, res) => {
        let Producer;
        try {
            const { parameters, instruction } = req.body;
            const configurationObject: IInstructionConfiguration = { parameters, instruction };
            Producer = new RPCProducer(channel, `Maxima`, configurationObject);
            const response = await Producer.produceTask();
            res.status(200).json(JSON.stringify(response));
        } catch (error) {
            res.status(400).json(JSON.stringify(error));
        } finally {
            if (Producer) Producer.teardown();
        }
    });

    return router;
};

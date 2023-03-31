import { Mongoose } from "mongoose";

module.exports = (mongoose: Mongoose) => {
    const Task = new mongoose.Schema({
        id: {
            type: String,
            required: true,
            unique: true,
        },
        name: {
            type: String,
            required: true,
            unique: true,
        },
        graph: {
            type: Object,
            required: true,
        },
        queue: {
            type: {
                minConsumers: Number,
            },
            required: true,
        },
        routes: {
            type: Object,
            required: true,
        },
    });
    return mongoose.model("Task", Task);
};

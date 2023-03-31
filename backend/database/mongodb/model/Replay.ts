import { Mongoose } from "mongoose";

module.exports = (mongoose: Mongoose) => {
    const Replay = new mongoose.Schema({
        hash: {
            type: String,
            required: true,
            unique: true,
        },
        user: {
            type: String,
            required: true,
        },
        graph: {
            type: Object,
            required: true,
        },
    });
    return mongoose.model("Replay", Replay);
};

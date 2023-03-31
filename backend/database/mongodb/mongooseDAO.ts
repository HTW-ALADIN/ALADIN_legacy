import mongoose from "mongoose";

module.exports = async () => {
    try {
        // manual configuration due to deprecation of collection.ensureIndex
        mongoose.set("useCreateIndex", true);
        mongoose.set("useFindAndModify", false);

        // Setup Connection
        await mongoose.connect(process.env.mongooseConnection, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        // Add all models to one object for better accessibility
        const db = mongoose;
        db.models.Replay = require("./model/Replay")(mongoose);
        db.models.Task = require("./model/Task")(mongoose);

        console.log(`Mongoose initialized!`);

        return db;
    } catch (err) {
        console.error(err);
    }
};

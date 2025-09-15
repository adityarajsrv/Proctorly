const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema(
    {
        candidateName: { type: String, required: true },
        type: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        message: { type: String },
    },
);

module.exports = mongoose.model("Event", EventSchema);
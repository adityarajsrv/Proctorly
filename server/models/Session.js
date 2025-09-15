const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
    {
        candidateName: { type: String, required: true },
        duration: { type: Number, required: true },
        events: [{ type: mongoose.Schema.Types.ObjectId, ref: "Event" }],
        integrityScore: { type: Number, required: true },
    });

module.exports = mongoose.model("Session", sessionSchema);
const express = require("express");
const router = express.Router();
const Event = require("../models/Event");

router.post("/", async (req, res) => {
    try{
        const event = new Event(req.body);
        await event.save();
        res.json({success: true, event});
    } catch (error) {
        console.error("Error saving event:", error);
        res.status(500).json({success: false, message: "Server error"});
    }
})

router.get('/', async (req, res) => {
    try {
        const events = await Event.find();
        res.json({success: true, events});
    } catch (error) {
        console.error("Error fetching events:", error);
        res.status(500).json({success: false, message: "Server error"});
    }
})

module.exports = router;
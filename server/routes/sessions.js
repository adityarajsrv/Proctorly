const express = require("express");
const router = express.Router();
const Session = require("../models/Session");

router.post('/', async (req, res) => {
    try{
        const session = new Session(req.body);
        await session.save();
        res.json({success: true, session});
    }catch (error) {
        console.error("Error saving session:", error);
        res.status(500).json({success: false, message: "Server error"});
    }
})

router.get("/", async (req, res) => {
    try {
        const sessions = await Session.find().populate('events');
        res.json({success: true, sessions});
    } catch (error) {
        console.error("Error fetching sessions:", error);
        res.status(500).json({success: false, message: "Server error"});
    }
});

module.exports = router;

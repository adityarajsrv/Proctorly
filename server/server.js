const express = require("express");
const cors = require("cors");
const connectDB = require("./config");

const eventRoutes = require("./routes/events");
const sessionRoutes = require("./routes/sessions");

require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

connectDB();

app.use("/api/events", eventRoutes);  
app.use("/api/sessions", sessionRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
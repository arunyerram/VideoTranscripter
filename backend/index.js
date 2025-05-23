const express = require("express");
const app = express();
const allroutes = require("./routes/AllRoutes");
const session = require('express-session');
const mongoose = require("mongoose");
const path = require("path");
const cors = require('cors');
const dotenv = require("dotenv");

dotenv.config();

app.use(express.json());
app.use(cors({ credentials: true, origin: 'http://localhost:3000' }));

// Use API routes
app.use("/api", allroutes);




// Default route to handle undefined routes
app.use("/", async (req, res) => {
    res.send("Welcome to Dune University");
});

// MongoDB connection
const db = async () => {
    try {
        console.log(process.env.DBURI);
        await mongoose.connect(process.env.DBURI);
        console.log("Connected to database");
    } catch (err) {
        console.log("Error connecting");
    }
}
db();

app.listen(5000, () => {
    console.log("Backend server listening at port http://localhost:5000");
});

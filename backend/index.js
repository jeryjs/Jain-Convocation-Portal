require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const authRoutes = require("./routes/authRoutes");
const courseRoutes = require("./routes/courseRoutes");
const requestRoutes = require("./routes/requestRoutes");
const adminRoutes = require("./routes/adminRoutes");
const emailRoutes = require("./routes/emailRoutes");

const app = express();

app.use(cors());
// Set limit to 500KB to account for base64 encoding overhead and other JSON data
app.use(express.json({ limit: "500kb" }));
app.use(express.urlencoded({ limit: "500kb", extended: true }));
app.use(bodyParser.json({ limit: "500kb" }));
app.use(bodyParser.urlencoded({ limit: "500kb", extended: true }));

app.use("/api", authRoutes);
app.use("/api", courseRoutes);
app.use("/api", requestRoutes);
app.use("/api", adminRoutes);
app.use("/api", emailRoutes);

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

async function initializeSettings() {
    const { getSettings } = require("./services/settings");
    const { updateSettingsCache } = require("./config/settings");

    try {
        const settings = await getSettings("all");
        updateSettingsCache(settings);
        console.log("Settings cache initialized with all categories");
    } catch (error) {
        console.error("Error initializing settings:", error);
    }
}

initializeSettings();

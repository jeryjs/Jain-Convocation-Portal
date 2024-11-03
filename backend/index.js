require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const firestoreRoutes = require('./routes/firestoreRoutes');
const courseRoutes = require('./routes/courseRoutes');
const emailRoutes = require('./routes/emailRoutes');

const app = express();

app.use(cors());
// Set limit to 500KB to account for base64 encoding overhead and other JSON data
app.use(express.json({ limit: '500kb' }));
app.use(express.urlencoded({ limit: '500kb', extended: true }));
app.use(bodyParser.json({ limit: '500kb' }));
app.use(bodyParser.urlencoded({ limit: '500kb', extended: true }));

app.use('/api', firestoreRoutes);
app.use('/api', courseRoutes);
app.use('/api', emailRoutes);

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

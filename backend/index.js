require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const firestoreRoutes = require('./routes/firestoreRoutes');
const courseRoutes = require('./routes/courseRoutes');
const emailRoutes = require('./routes/emailRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use(bodyParser.json());

app.use('/api', firestoreRoutes);
app.use('/api', courseRoutes);
app.use('/api', emailRoutes);

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

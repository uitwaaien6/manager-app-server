'use strict';

require('dotenv').config();
require('./models/User');
require('./models/Employee');
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const { authentication } = require('./middlewares/authentication');
const { userEmailVerification } = require('./middlewares/userEmailVerification');
const app = express();

app.use(bodyParser.json());
app.use(authRoutes);
app.use(employeeRoutes);

const mongoUri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.oxbp6.mongodb.net/manager?retryWrites=true&w=majority`;

mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true
});

mongoose.connection.on('connected', () => {
    console.log('Connected to Mongo instance...');
});

mongoose.connection.on('error', (err) => {
    console.log('Error connection to mongo instance: ' + err);
});

app.get('/', authentication, (req, res) => {
    const email = req.user.email;
    res.send({ emai });
});

app.listen(3000, (req, res) => {
    console.log('Listening on port: 3000');
});

console.log('WITHOUT WARNING!!!');
'use strict';

require('dotenv').config();
require('./models/User');
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/authRoutes');
const { authentication } = require('./middlewares/authentication');
const { isUserVerified } = require('./middlewares/isUserVerified');
const app = express();

app.use(bodyParser.json());
app.use(authRoutes);

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
})

app.get('/', authentication, (req, res) => {
    res.send({ email: req.user.email });
});

app.listen(3000, (req, res) => {
    console.log('Listening on port: 3000');
});

console.log(process.env.DB_USERNAME);
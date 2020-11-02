const express = require('express');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const jwt = require('jsonwebtoken');
const validator = require('email-validator');
const nodemailer = require('nodemailer');
const { decryptPassword } = require('../encryption/coefficientFairEncryption');
const { authentication } = require('../middlewares/authentication');

const JWT_Exp = 11000000.00;

const router = express.Router();

async function sendVerificationEmail(email, user) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'ruzgarata6@gmail.com',
            pass: process.env.GMAIL_PASSWORD
        }
    });
      
    const mailOptions = {
        from: 'no-reply@konsolgetir.com',
        to: email,
        subject: 'Thank you for using our app, please verify your email address by cliking the link below',
        text: ``
    };
      
    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    }); 
}

// #route:  POST /register
// #desc:   Register a new user
// #access: Public

router.post('/signup', async (req, res) => {
    const { userName, email, passwordEncryption, passwordConfirmEncryption } = req.body;

    const password = decryptPassword(passwordEncryption);
    const passwordConfirm = decryptPassword(passwordConfirmEncryption);

    if (!email || !password || !passwordConfirm) {
        return res.status(422).send({ msg: 'must provide email and password' });
    }

    if (password !== passwordConfirm) {
        return res.status(422).send({ error: 'password-match', msg: 'Passwords do not match' });
    }

    if (!validator.validate(email)) {
        console.log('invalid email');
        return res.status(422).send({ error: 'invalid-email', msg: 'Email is not valid' });
    }

    try {
        const user = await User.findOne({ email });
        if (user) {
            return res.status(400).send({ msg: 'The email adress you entered is already in use' });
        }
    } catch (error) {
        console.log(error.message);
    }

    try {
        const user = new User({ email, password, isVerified: false });
        await user.save();

        //sendEmail(email, user);

        // calculate the expiration date of json web token by adding millisceonds to the current time
        const tokenExpInMin = Math.floor(JWT_Exp / 60000);
        const token = jwt.sign({ userId: user._id }, 'MY_SECRET_KEY', { expiresIn: `${tokenExpInMin}m` });
        const expiration = Date.now() + JWT_Exp;

        res.json({ 
            token,
            expiration
        });
    } catch (error) {
        console.log(error.message);
        return res.status(422).send({ msg: 'Something went wrong in signup' });
    }
});



router.get('/api/auth/verification/verify-account/:userId/:verificationToken', async (req, res) => {
    const { userId, verificationToken } = req.params;
    if (!userId || !verificationToken) {
        return res.redirect('/');
    }

    try {
        const user = await User.findById({ userId });
        if (!user) {
            return res.status(422).send({ error: 'user-not-found', msg: 'User couldnt be found with this id' });
        }
    } catch (error) {
        console.log(error.message);
    }

    console.log('This user has been verified');
    console.log(user);
    res.send('Your Account has been verified');
});


router.post('/signin', async (req, res) => {
    const { email, passwordEncryption } = req.body;
    const password = decryptPassword(passwordEncryption);

    if (!email || !password) {
        return res.status(422).send({ msg: 'Something went wrong' });
    }
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(422).send({ error: 'Email not found' });
    }
    try {
        await user.comparePassword(password);
        const tokenExpInMin = Math.floor(JWT_Exp / 60000);
        const token = jwt.sign({ userId: user._id }, 'MY_SECRET_KEY', { expiresIn: `${tokenExpInMin}m` });
        const expiration = Date.now() + JWT_Exp;
        res.json({ 
            token,
            expiration
        });
    } catch (error) {
        return res.status(422).send({ error: 'Invalid password or email' });
    }
});

module.exports = router;


const express = require('express');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const jwt = require('jsonwebtoken');
const validator = require('email-validator');
const { decryptPassword } = require('../encryption/coefficientFairEncryption');
const { authentication } = require('../middlewares/authentication');
const { userEmailVerification } = require('../middlewares/userEmailVerification');
const { sendVerificationEmail } = require('../email/sendVerificationEmail');

const JWT_EXP = 11000000.00;
const EMAIL_VERIFICATION_EXP = 11000000.00;

const router = express.Router();

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
        return res.status(400).send({ msg: 'The email adress you entered is already in use' });
    }

    try {
        const secretEmailToken = Math.random().toString().split('.')[1];
        const user = new User({ email, password, secretEmailToken, status: 'pending' });
        await user.save();

        const emailVerificationExp = Date.now() + EMAIL_VERIFICATION_EXP;
        const emailVerificationLink = `https://ff091a243e67.ngrok.io/api/auth/verification/verify-account/${user._id}/${user.secretEmailToken}/${emailVerificationExp}`;

        sendVerificationEmail(email, emailVerificationLink);

    } catch (error) {
        console.log(error.message);
        return res.status(422).send({ msg: 'Something went wrong in signup' });
    }


    const user = await User.findOne({ email });
    res.json({ status: user.status });
});

// #route:  GET /api/auth/verification/verify-account/:userId/:verificationToken
// #desc:   Email verification route
// #access: Private
router.get('/api/auth/verification/verify-account/:userId/:verificationToken/:expiration', async (req, res) => {
    const { userId, verificationToken, expiration } = req.params;

    if (!userId || !verificationToken || !expiration) {
        return res.status(422).send({ error: 'null-type', msg: 'userId or verificationToken doesnt exist' });
    }

    try {
        const user = await User.findById(userId);

        if (!user) {
            return res.status(422).send({ error: 'user-not-found', msg: 'User couldnt be found with this id' });
        }

        if (user.secretEmailToken !== verificationToken || Date.now() > expiration) {
            return res.status(422).send({ error: 'verificationToken-does-not-match, verificationToken-expired', msg: 'Users secretEmailToken doesnt match with verificationToken or its expired' });
        }

        await User.updateOne({ _id: userId }, { $set: { status: 'active', secretEmailToken: null } });
    } catch (error) {
        console.log(error.message);
    }

    res.send('Your Account has been verified');
});

// #route:  GET /api/auth/verification/verify-account/resend/:userId/:verificationToken
// #desc:   Email resend verification route
// #access: Private
router.get('/api/auth/verification/verify-account/resend-link', authentication, async (req, res) => {
    const user = req.user;

    if (!user) {
        return res.status(422).send({ error: 'user-not-found', msg: 'User couldnt be found' });
    }

    const secretEmailToken = Math.random().toString().split('.')[1];

    try {
        await User.updateOne({ _id: user._id }, { $set: { secretEmailToken } });

        const emailVerificationExp = Date.now() + EMAIL_VERIFICATION_EXP;
        const emailVerificationLink = `https://ff091a243e67.ngrok.io/api/auth/verification/verify-account/${user._id}/${secretEmailToken}/${emailVerificationExp}`;

        sendVerificationEmail(user.email, emailVerificationLink);
    } catch (error) {
        console.log(error.message);
        return res.status(422).send({ error: 'Couldnt update users email token' });
    }

    res.send('Email verification link has been re-sent to your email');
});


router.post('/signin', async (req, res) => {
    const { email, passwordEncryption } = req.body;
    const password = decryptPassword(passwordEncryption);

    if (!email || !password) {
        return res.status(422).send({ msg: 'Something went wrong' });
    }

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(422).send({ error: 'Email not found' });
        }

        await user.comparePassword(password);

        const tokenExpInMin = Math.floor(JWT_EXP / 60000);
        const token = jwt.sign({ userId: user._id, status: user.status }, 'MY_SECRET_KEY', { expiresIn: `${tokenExpInMin}m` });
        const jwtExpiration = Date.now() + JWT_EXP;
        const status = user.status;

        res.json({ 
            token,
            jwtExpiration,
            status
        });

    } catch (error) {
        return res.status(422).send({ error: 'Invalid password or email' });
    }
});

router.get('/api/auth/get-status', authentication, (req, res) => {
    const status = req.user.status;
    res.send(status);
});

module.exports = router;


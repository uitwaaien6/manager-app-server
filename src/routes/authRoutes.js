const express = require('express');
const secureRandomString = require('secure-random-string');
const PasswordValidator = require('password-validator');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const jwt = require('jsonwebtoken');
const emailValidator = require('email-validator');
const { decryptPassword } = require('../encryption/coefficientFairEncryption');
const { authentication } = require('../middlewares/authentication');
const { sendVerificationEmail } = require('../email/sendVerificationEmail');


const JWT_EXP = 11000000.00;
const EMAIL_VERIFICATION_EXP = 11000000.00;
const ACTIVE_EMAIL_STATUS = 'active';
const PENDING_EMAIL_STATUS = 'pending';

const router = express.Router();

// #route:  POST /register
// #desc:   Register a new user
// #access: Public
router.post('/signup', async (req, res) => {
    const { userName, email, passwordEncryption, passwordConfirmEncryption } = req.body;

    const password = decryptPassword(passwordEncryption);
    const passwordConfirm = decryptPassword(passwordConfirmEncryption);

    const passwordSchema = new PasswordValidator();
 
    passwordSchema
    .is().min(8)                                    // Minimum length 8
    .is().max(100)                                  // Maximum length 100
    .has().uppercase()                              // Must have uppercase letters
    .has().lowercase()                              // Must have lowercase letters
    .has().digits(2)                                // Must have at least 2 digits
    .has().not().spaces()                           // Should not have spaces
    .is().not().oneOf(['Passw0rd', 'Password123']); // Blacklist these values

    if (!email || !password || !passwordConfirm) {
        return res.status(422).send({ msg: 'must provide email and password' });
    }

    if (password !== passwordConfirm) {
        return res.status(422).send({ error: 'password-match', msg: 'Passwords do not match' });
    }

    if (!emailValidator.validate(email)) {
        console.log('invalid email');
        return res.status(422).send({ error: 'invalid-email', msg: 'Email is not valid' });
    }

    if (!passwordSchema.validate(password)) {
        return res.status(422).send({ error: 'invalid-password', msg: 'The password you entered is not secure' });
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

        const secretEmailToken = secureRandomString({ length: 128 });
        const user = new User({ email, password, secretEmailToken, status: 'pending' });
        await user.save();

        const emailVerificationExp = Date.now() + EMAIL_VERIFICATION_EXP;
        const emailVerificationLink = `https://63437656ff2b.ngrok.io/api/auth/verification/verify-account/${user._id}/${user.secretEmailToken}/${emailVerificationExp}`;

        sendVerificationEmail(email, emailVerificationLink);

    } catch (error) {
        console.log(error.message);
        return res.status(422).send({ msg: 'Something went wrong in signup' });
    }


    const user = await User.findOne({ email });
    res.json({ 
        success: true,
        status: user.status,
    });
});

// #route:  GET /api/auth/verification/verify-account/:userId/:verificationToken:expiration
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

        user.status = 'active';
        user.secretEmailToken = null;
        await user.save();
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

    const secretEmailToken = secureRandomString({ length: 128 });

    try {
        user.secretEmailToken = secretEmailToken;
        await user.save();

        const emailVerificationExp = Date.now() + EMAIL_VERIFICATION_EXP;
        const emailVerificationLink = `https://63437656ff2b.ngrok.io/api/auth/verification/verify-account/${user._id}/${secretEmailToken}/${emailVerificationExp}`;

        sendVerificationEmail(user.email, emailVerificationLink);

    } catch (error) {
        console.log(error.message);
        return res.status(422).send({ error: 'Couldnt update users email token' });
    }

    res.send('Email verification link has been re-sent to your email');
});

// #route:  GET /api/auth/verification/verify-account/check-user-status
// #desc:   User check status route
// #access: Private
router.get('/api/auth/verification/verify-account/check-user-status', authentication, (req, res) => {
    const user = req.user;

    if (!user) {
        return res.status(401).send({ error: 'Email not found' });
    }

    try {
        if (user.status !== ACTIVE_EMAIL_STATUS) {
            console.log('Verify your email');
            return res.status(401).send({ error: 'email-not-verified', msg: 'The user email is not verified, not authorized' });
        }
    } catch (error) {
        return res.status(422).send({ error, msg: 'Something went wrong in check email validity' });
    }

    res.send('User is active');
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

        res.json({ 
            token,
            jwtExpiration
        });

    } catch (error) {
        return res.status(422).send({ error: 'Invalid password or email' });
    }
});

module.exports = router;


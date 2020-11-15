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
const { sendPasswordResetEmail } = require('../email/sendPasswordResetEmail');
const { sendWarningEmail } = require('../email/sendWarningEmail');

const DOMAIN_ENDPOINT = `https://939b52fd0d43.ngrok.io`;
const JWT_EXP = 11000000;
const EMAIL_VERIFICATION_EXP = 11000000;
const PASSWORD_RESET_CODE_EXP = 1100000;
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


    const checkUser = await User.findOne({ email });
    if (checkUser) {
        return res.status(422).send({ error: 'email-already-in-use', msg: 'Email you entered is already in use' });
    }

    try {

        const emailVerificationToken = secureRandomString({ length: 128 });
        const user = new User({ email, password, emailVerificationToken, status: PENDING_EMAIL_STATUS });
        await user.save();

        const emailVerificationExp = Date.now() + EMAIL_VERIFICATION_EXP;
        const emailVerificationLink = `${DOMAIN_ENDPOINT}/api/auth/verification/verify-account/${user._id}/${user.emailVerificationToken}/${emailVerificationExp}`;
        
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

        if (user.emailVerificationToken !== verificationToken || Date.now() > expiration) {
            return res.status(422).send({ error: 'verificationToken-does-not-match, verificationToken-expired', msg: 'Users token doesnt match with verification token or its expired' });
        } else {
            user.status = ACTIVE_EMAIL_STATUS;
            user.emailVerificationToken = undefined;
            await user.save();
    
            res.json({ success: true, msg: 'Your account has been verified' });
        }

    } catch (error) {
        console.log(error.message);
        return res.status(422).send({ error });
    }

});

// #route:  GET /api/auth/verification/verify-account/resend-link
// #desc:   Email resend verification route
// #access: Private
router.get('/api/auth/verification/verify-account/resend-link', authentication, async (req, res) => {
    const user = req.user;

    if (!user) {
        return res.status(422).send({ error: 'user-not-found', msg: 'User couldnt be found' });
    } else {
        const emailVerificationToken = secureRandomString({ length: 128 });

        try {
            user.emailVerificationToken = emailVerificationToken;
            await user.save();
    
            const emailVerificationExp = Date.now() + EMAIL_VERIFICATION_EXP;
            const emailVerificationLink = `${DOMAIN_ENDPOINT}/api/auth/verification/verify-account/${user._id}/${emailVerificationToken}/${emailVerificationExp}`;
    
            sendVerificationEmail(user.email, emailVerificationLink);
    
            res.send('Email verification link has been re-sent to your email');
        } catch (error) {
            console.log(error.message);
            return res.status(422).send({ error: 'Couldnt update users email token' });
        }
    }


});

// #route:  GET /api/auth/verification/verify-account/check-user-status
// #desc:   User check status route
// #access: Private
router.get('/api/auth/verification/verify-account/check-user-status', authentication, (req, res) => {
    const user = req.user;

    if (!user) {
        return res.status(401).send({ error: 'Email not found' });
    } else {
        try {
            if (user.status !== ACTIVE_EMAIL_STATUS) {
                return res.status(401).send({ error: 'email-not-verified', msg: 'The user email is not verified, not authorized' });
            } else {
                res.json({ success: true, status: user.status });
            }
        } catch (error) {
            return res.status(422).send({ error, msg: 'Something went wrong in check email validity' });
        }
    }
});

// #route:  POST /signin
// #desc:   Sign user in route
// #access: Public
router.post('/signin', async (req, res) => {
    const { email, passwordEncryption } = req.body;

    if (!passwordEncryption) {
        return res.status(422).send({ error: 'password-encryption-missin' });
    }

    const password = decryptPassword(passwordEncryption);

    if (!email || !password) {
        return res.status(422).send({ msg: 'Something went wrong' });
    } else {
        try {
            const user = await User.findOne({ email });
    
            if (!user) {
                return res.status(422).send({ error: 'Email not found' });
            } else {
                await user.comparePassword(password);
                const tokenExpInMin = Math.floor(JWT_EXP / 60000);
                const token = jwt.sign({ userId: user._id, status: user.status }, 'MY_SECRET_KEY', { expiresIn: `${tokenExpInMin}m` });
                const jwtExpiration = Date.now() + JWT_EXP;
                res.json({ token, jwtExpiration });
            }
        } catch (error) {
            return res.status(422).send({ error: 'Invalid password or email' });
        }
    }

});


// #route:  POST /api/auth/verification/password-reset/generate-code
// #desc:   Generate password reset code for the user and send it through email
// #access: Private
router.post('/api/auth/verification/password-reset/generate-code', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(422).send({ error: 'email-not-found', msg: 'Please provide email' });
    } else {
        try {
            const user = await User.findOne({ email });

            if (!user) {
                return res.status(422).send({ error: 'user-not-found', msg: 'The user associated with this email is not found' });
            } else {
                const passwordResetCode = secureRandomString({ length: 6, alphanumeric: true }).toUpperCase();
                const passwordResetCodeExpiration = Date.now() + PASSWORD_RESET_CODE_EXP;
                user.passwordResetCode = passwordResetCode;
                user.passwordResetCodeExpiration = passwordResetCodeExpiration;
                await user.save();
                await sendPasswordResetEmail(user.email, passwordResetCode);
                res.json({ success: true });
            }
        } catch (error) {
            console.log(error.message);
            return res.status(422).send({ error: 'error-in-generate-code' });
        }
    }

});

// #route:  POST /api/auth/verification/password-reset/verify-code
// #desc:   Verify users password reset code by post requesting the code if it is valid redirect them to password reset screen
// #access: Public
router.post('/api/auth/verification/password-reset/verify-code', async (req, res) => {
    const { email, passwordResetCodeEncryption } = req.body;

    // extract the coefficients from the password reset code
    const passwordResetCode = decryptPassword(passwordResetCodeEncryption);

    if (!email || !passwordResetCode) {
        return res.status(422).send({ error: 'email-not-found', msg: 'Please provide email' });
    } else {
        try {
            const user = await User.findOne({ email });

            if (!user) {
                return res.status(422).send({ error: 'user-not-found', msg: 'The user associated with this email is not found' });
            }

            if (Date.now() > user.passwordResetCodeExpiration) {
                return res.status(422).send({ error: 'password-reset-code-expired', msg: 'Password reset code expired' });
            }

            if (user.passwordResetCode !== passwordResetCode) {
                return res.status(422).send({ error: 'password-reset-code-not-match', msg: 'Password reset code doesnt match' });
            } else {
                //user.passwordResetCode = undefined;
                ///user.passwordResetCodeExpiration = undefined;
                //await user.save();
                // will delete the password reset code in the next step, after the user enter their new password if it valid.
                res.json({ success: true });
            }
        } catch (error) {
            console.log(error.message);
            return res.status(422).send({ error: 'error-in-verify-code' });
        }
    }

});

// #route:  POST /api/auth/verification/password-reset/reset-password
// #desc:   Finally after some flow change users password
// #access: Private
router.post('/api/auth/verification/password-reset/reset-password', async (req, res) => {
    const { email, newPasswordEncryption, newPasswordConfirmEncryption, passwordResetCode } = req.body;

    if (!newPasswordEncryption || !newPasswordConfirmEncryption) {
        return res.status(422).send({ error: 'missing-credentials' });
    }

    const newPassword = decryptPassword(newPasswordEncryption);
    const newPasswordConfirm = decryptPassword(newPasswordConfirmEncryption);

    
    if (!email || !newPassword || !newPasswordConfirm) {
        console.log('one of the credentials are missing');
        return res.status(422).send({ error: 'missin-credentials', msg: 'Please provide email nad password' });
    } 

    const user = await User.findOne({ email });

    if (!user) {
        console.log('user couldnt be found');
        return res.status(422).send({ error: 'user-not-found', msg: 'The user associated with this email is not found' });
    }

    if (newPassword !== newPasswordConfirm) {
        console.log('passwords doesnt match');
        return res.status(422).send({ error: 'passwords-does-not-match', msg: 'Provided password doesnt match' });
    }

    if (Date.now() > user.passwordResetCodeExpiration) {

        return res.status(422).send({ error: 'password-reset-code-expired', msg: 'Password reset code expired' });
    }

    const passwordSchema = new PasswordValidator();

    passwordSchema
    .is().min(8)                                    // Minimum length 8
    .is().max(100)                                  // Maximum length 100
    .has().uppercase()                              // Must have uppercase letters
    .has().lowercase()                              // Must have lowercase letters
    .has().digits(2)                                // Must have at least 2 digits
    .has().not().spaces()                           // Should not have spaces
    .is().not().oneOf(['Passw0rd', 'Password123']); // Blacklist these values

    if (!passwordSchema.validate(newPassword)) {
        return res.status(422).send({ error: 'invalid-password', msg: 'The password you entered is not secure' });
    }

    try {

        if (user.passwordResetCode !== passwordResetCode) {
            return res.status(422).send({ error: 'password-reset-code-not-match', msg: 'Password reset code doesnt match' });
        } else {
            user.password = newPassword;
            user.passwordResetCode = undefined;
            user.passwordResetCodeExpiration = undefined;
            await user.save();
            await sendWarningEmail(user.email);
            res.json({ success: true });
        }

    } catch (error) {
        console.log(error.message);
        return res.status(422).send({ error: 'error-in-verify-code' });
    }

});

module.exports = router;


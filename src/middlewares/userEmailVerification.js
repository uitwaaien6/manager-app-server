const mongoose = require('mongoose');
const User = mongoose.model('User');

async function userEmailVerification(req, res, next) {
    const { email } = req.body;

    if (!email) {
        return res.status(422).send({ err: 'bad-credentials', msg: 'You must provide email' });
    }

    try {
        await User.findOne({ email });
    } catch (error) {
        console.log(error.message);
        return res.status(422).send({ error: 'email-null', msg: 'The given email is doesnt exist' });
    }

    if (user.status !== 'active') {
        return res.status(422).send({ error: 'email-not-verified', msg: 'The user email is not verified' });
    }
    
    next();
}

module.exports = { userEmailVerification };
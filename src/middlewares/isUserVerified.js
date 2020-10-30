const mongoose = require('mongoose');
const User = mongoose.model('User');


async function isUserVerified(req, res, next) {
    const { email } = req.body;

    if (!email) {
        return res.status(422).send({ err: 'bad-credentials', msg: 'You must provide email' });
    }

    const user = await User.findOne({ email });
    if (!user || !user.isVerified) {
        return res.status(422).send({ msg: 'The email assoiciated with this account has not been verified' });
    }

    console.log('User is verified');
    next();
}

module.exports = { isUserVerified };
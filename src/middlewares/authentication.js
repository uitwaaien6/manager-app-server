const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = mongoose.model('User');

function authentication(req, res, next) {
    const { authorization } = req.headers;

    if (!authorization) {
        return res.status(401).send({ error: 'You must be logged in' });
    }

    const token = authorization.replace('Bearer ', '');
    jwt.verify(token, 'MY_SECRET_KEY', async (err, payload) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                console.log('JWT has expired');
                return res.status(401).send({ error: 'You must be logged in' });

            }
            return res.status(401).send({ error: 'You must be logged in' });
        }

        const { userId } = payload;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(422).send({ error: 'no-user', msg: 'user couldnt be found with the given Id'});
        }
        req.user = user;
        next();
    });

}

module.exports = { authentication };
const JWT = require('jsonwebtoken');
const secret = "@dity@@123";

function createTokenForUser(user){
    const payload = {
        id: user.id || user._id || user.email,
        fullName: user.fullName,
        email: user.email,
        profileImageURL: user.profileImageURL,
        role: user.role
    };
    const token = JWT.sign(payload, secret, { expiresIn: '1h' });
    return token;
}

function verifyToken(token){
    const payload = JWT.verify(token, secret);
    return payload;
}

module.exports = {
    createTokenForUser,
    verifyToken
}

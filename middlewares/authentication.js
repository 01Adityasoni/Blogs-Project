const { verifyToken } = require('../services/authentication');


function checkForAuthenticationCookie(cookieName) {
    return (req, res, next) => {
        const token = req.cookies[cookieName];
        if (!token) {
            return next();
        }

        try{
            const userPayload = verifyToken(token);
            req.user = userPayload;
            next();
        }
        catch(error){
            console.error("Token verification failed:", error);
            next();
        }
    }
}

module.exports = {
    checkForAuthenticationCookie
}
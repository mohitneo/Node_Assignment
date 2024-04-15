const jwt = require('jsonwebtoken');
require('dotenv').config();
const { jwtSecretKey } = process.env;

const validateRequest = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(403).send('A token is required for authentication');
  }

  try {
    const token = authorization.split(' ')[1];
    const decodedToken = jwt.verify(token, jwtSecretKey);
    const { userId } = decodedToken.data;

    if (userId) {
      req.userId = userId;
      next();
    } else {
      return res.status(401).send('Invalid Token');
    }
  } catch (err) {
    return res.status(401).send('Invalid Token');
  }
};

module.exports = validateRequest;

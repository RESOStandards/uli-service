const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const createSecret = (payload) => {
  const { providerUoi, recipientUoi, reportId, passedDate } = payload;
  //TODO product and job Id to be added to hash
  return crypto
    .createHash("sha384")
    .update(`${providerUoi}${recipientUoi}${reportId}${passedDate}`)
    .digest("base64");
};

const createToken = (payload) => {
  const token = jwt.sign(payload, createSecret(payload));
  return token;
};

const verifyToken = (token, payload) => {
  let decoded;
  try {
    decoded = jwt.verify(token, createSecret(payload));
  } catch (error) {
    return null;
  }
  return decoded;
};

module.exports = {
  createToken,
  verifyToken,
};

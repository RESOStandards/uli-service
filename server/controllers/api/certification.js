const logger = require("logger");
const axios = require("axios");

const getTerms = async (req, res) => {
  try {
    const terms = await axios.get(
      `https://reso-public.s3.us-east-2.amazonaws.com/reso-terms`
    );
    return res.status(200).send(terms.data);
  } catch (error) {
    logger.error("getTerms Controller API:", error);
    return res.status(400).send(error);
  }
};

module.exports = {
  getTerms,
};

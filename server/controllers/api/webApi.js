const logger = require("logger");
const webApiService = require("services/webApi");
const { CustomError } = require("utils/customError");
const { statusConstants } = require("commonConstants/certification");

const find = async (req, res) => {
  try {
    const { id } = req.params;
    const { token, providerUoi } = req.query;
    const { Authorization, isPublic } = req.headers;
    const headerOptions = { Authorization };
    const { report, isTokenVerified } = await webApiService.find(
      { id, token },
      headerOptions
    );
    if (
      (isPublic &&
        report.status !== statusConstants.certified.value &&
        !isTokenVerified) ||
      (providerUoi && report.providerUoi !== providerUoi)
    ) {
      throw new CustomError("Report Not Found", 404);
    }
    return res.send(report);
  } catch (error) {
    logger.error("Web API Report find Controller API:", error);
    return res
      .status(error?.response?.status || error?.code || 400)
      .send(error);
  }
};

module.exports = {
  find,
};

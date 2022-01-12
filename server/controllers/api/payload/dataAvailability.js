const logger = require("logger");
const dataAvailabilityService = require("services/payload/dataAvailability");
const axios = require("axios");
const elasticUtils = require("utils/elastic");

const getReport = async (req, res) => {
  try {
    const { Authorization, isadmin: isAdmin, userInfo } = req.headers;
    const { reportId } = req.params;
    const { token } = req.query;
    const report = await dataAvailabilityService.getReport(reportId, { Authorization }, isAdmin, token, userInfo);
    return res.status(200).send(report);
  } catch (error) {
    logger.error("Data Availability get Report Controller API:", error);
    return res.status(400).send(error);
  }
};

const getDataAvailabilitiesAndAverage = async (req, res) => {
  try {
    const { Authorization } = req.headers;
    const { reportIds } = req.body;
    const report = await dataAvailabilityService.getDataAvailabilitiesAndAverage(reportIds, { Authorization });
    return res.status(200).send(report);
  } catch (error) {
    logger.error("Data Availability and market avg get Report Controller API:", error);
    return res.status(400).send(error);
  }
};

const getMarketAvailability = async (req, res) => {
  try {
    const { Authorization } = req.headers;
    const { reportId } = req.params;
    const report = await dataAvailabilityService.getMarketAvailability(reportId, { Authorization });
    return res.status(200).send(report);
  } catch (error) {
    logger.error("market Availability get Report Controller API:", error);
    return res.status(400).send(error);
  }
};

const createAvailability = async (req, res) => {
  try {
    const availabilityReport = req.body;
    const { Authorization } = req.headers;
    const { reportId } = req.params;
    const response = await axios({
      method: "GET",
      baseURL: elasticUtils.baseUrl,
      url: `/certification-report/_doc/${reportId}`,
      headers: { Authorization },
    });
    await dataAvailabilityService.createReport({ ...response.data._source, _id: reportId }, { Authorization }, availabilityReport);
    return res.status(200).send({ success: true });
  } catch (error) {
    logger.error("create Report Controller API:", error);
    return res.status(400).send(error);
  }
};

module.exports = {
  getReport,
  getDataAvailabilitiesAndAverage,
  getMarketAvailability,
  createAvailability
};

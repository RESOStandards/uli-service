const elasticUtils = require("utils/elastic");
const axios = require("axios");
const { standardResourcesUrls } = require("commonConstants/standardResources");
const dataDictionaryService = require("./dataDictionary");
const utils = require("utils");
const tokenUtils = require("utils/token");

const RESOURCE = "Resource";

const find = async ({ id, token }, headerOptions) => {
  try {
    const response = await axios({
      method: "GET",
      baseURL: elasticUtils.baseUrl,
      url: `/certification-report/_doc/${id}`,
      headers: headerOptions,
    });
    let decodedToken;
    let isTokenVerified = false;
    if (token) {
      const {
        providerUoi,
        recipientUoi,
        generatedOn: passedDate,
      } = response.data._source;
      decodedToken = tokenUtils.verifyToken(token, {
        providerUoi,
        recipientUoi,
        passedDate,
        reportId: id,
      });
      isTokenVerified = !!(decodedToken?.reportId === id);
    }
    const webApiReport = response.data._source;
    const { parameters } = webApiReport;

    const resource = parameters.find(
      (parameter) => parameter.name === RESOURCE
    );
    const transformedParams = await Promise.all(
      parameters.map(async (param) =>
        param.name === RESOURCE
          ? { ...param, wikiPageURL: standardResourcesUrls[param.value] }
          : {
            ...param,
            wikiPageURL: (
              await dataDictionaryService.getFieldDetails(
                param.value,
                resource.value
              )
            )?.wikiPageURL,
          }
      )
    );
    return {
      report: { ...webApiReport, parameters: transformedParams },
      isTokenVerified,
    };
  } catch (error) {
    return Promise.reject(utils.getErrorMessageFromElastic(error) || error);
  }
};

module.exports = {
  find,
};

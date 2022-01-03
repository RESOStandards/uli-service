const logger = require("logger");
const axios = require("axios");
const utils = require("utils");
const elasticUtils = require("utils/elastic");
const Promise = require("bluebird");
const _ = require("lodash");
const { CustomError } = require("utils/customError");

const getOrganization = async (uoi, headerOptions) => {
  try {
    const response = await axios({
      method: "GET",
      baseURL: elasticUtils.baseUrl,
      url: `/uoi/_doc/${uoi}`,
      headers: headerOptions,
    });
    return response.data._source;
  } catch (error) {
    if (error?.response?.data?.found === false) {
      throw new CustomError("Invalid UOI", 404);
    }
    logger.error(
      `Error while fetching the Organization info of uoi => ${uoi}` +
        (utils.getErrorMessageFromElastic(error) || error)
    );
    return Promise.reject(error);
  }
};

const checkIndexExists = async (headerOptions) => {
  let indexExist = true;
  try {
    await axios({
      method: "HEAD",
      baseURL: elasticUtils.baseUrl,
      url: `/uoi`,
      headers: headerOptions,
    });
  } catch (error) {
    //The control comes to this part of code when elastic return 404 Not found error for the index, else the index is found.
    if (error.response) {
      indexExist = !_.isEmpty(error.response.data);
    } else {
      throw new Error(error);
    }
  }
  if (indexExist) {
    logger.info("UOI Index exists");
  } else {
    const body = {
      settings: {
        analysis: {
          normalizer: {
            custom_sort_normalizer: {
              type: "custom",
              char_filter: [],
              filter: ["lowercase", "asciifolding"],
            },
          },
        },
      },
      mappings: {
        properties: {
          name: {
            type: "keyword",
            fields: {
              keyword: {
                type: "keyword",
                normalizer: "custom_sort_normalizer",
                ignore_above: 256,
              },
            },
          },
        },
      },
    };
    await axios({
      method: "PUT",
      baseURL: elasticUtils.baseUrl,
      url: `/uoi`,
      data: body,
      headers: headerOptions,
    });
  }
};

const syncOrganization = async (headerOptions) => {
  try {
    const { values: organizations } = (
      await axios({
        method: "GET",
        url: `https://sheets.googleapis.com/v4/spreadsheets/13azRbctJ3V2yTibmFYLSfJZsdHc8v3r2NEgEmoHviRc/values/A:Z?key=AIzaSyC3CoafSxwPtAkdSS0qrzTH6Mzv9ruSAxc`,
      })
    ).data; //values are array of array from sheets
    /*
@sheetColumns for reference
[
  "OrganizationUniqueId",
  "OrganizationType",
  "AssnToMls",
  "OrganizationName",
  "OrganizationAddress1",
  "OrganizationCity",
  "OrganizationStateOrProvince",
  "OrganizationPostalCode",
  "OrganizationWebsite",
  "OrganizationCountry",
  "OrganizationStatus",
  "ModificationTimestamp",
  "OrganizationStatusChangeTimestamp",
  "OrganizationComments",
  "OrganizationLatitude",
  "OrganizationLongitude",
  "OrganizationMemberCount",
];*/

    const systems = (
      await axios({
        method: "GET",
        url: `https://sheets.googleapis.com/v4/spreadsheets/13azRbctJ3V2yTibmFYLSfJZsdHc8v3r2NEgEmoHviRc/values/USI!A:Z?key=AIzaSyC3CoafSxwPtAkdSS0qrzTH6Mzv9ruSAxc`,
      })
    ).data.values
      .slice(1)
      .map((item) => {
        return {
          providerUoi: item[0],
          usi: item[2],
          systemName: item[3],
          isActive: item[4] === "TRUE",
        };
      }); //values are array of array from sheets
    /*
    @sheetColumns for reference
    [
      "ProviderUoi",
      "ProviderName",
      "UniqueSystemId",
      "SystemName",
      "Notes"
    ];*/

    await checkIndexExists(headerOptions);
    await Promise.map(
      organizations.entries(),
      async ([index, org]) => {
        //skipping first row since it is column names
        if (index) {
          const [
            uoi,
            type,
            assnToMls,
            name,
            address,
            city,
            state,
            zip,
            url,
            country,
            active,
            updated,
            statusUpdated,
            comments,
            latitude,
            longitude,
            memberCount,
            organizationCertName,
            organizationDdVersion,
            organizationDdStatus,
            organizationWebApiVersion,
            organizationWebApiStatus,
          ] = org;
          let cleanedMemberCount =
            memberCount === "Unknown" ? 0 : parseInt(memberCount);

          const uoiBody = {
            doc: {
              uoi,
              type,
              assnToMls,
              name,
              address,
              city,
              state,
              zip,
              url,
              country,
              active: !!parseInt(active),
              updated,
              statusUpdated,
              comments,
              latitude,
              longitude,
              organizationCertName,
              organizationDdVersion,
              organizationDdStatus,
              organizationWebApiVersion,
              organizationWebApiStatus,
              memberCount: cleanedMemberCount,
              lastSyncedAt: new Date(),
              systems: systems.filter((system) => system.providerUoi === uoi),
            },
            doc_as_upsert: true,
          };
          await axios({
            method: "POST",
            baseURL: elasticUtils.baseUrl,
            url: `/uoi/_update/${uoi}`,
            data: uoiBody,
            headers: headerOptions,
          });
        }
      },
      { concurrency: 200 }
    );
  } catch (error) {
    logger.error(`Error while syncing the Organization `, error);
    return Promise.reject(error);
  }
};
const searchOrganizationsWithNameandUoi = async (
  { size = 5000, sortBy = "asc", searchKey },
  headerOptions
) => {
  try {
    const uoiPayload = {
      sort: {
        "name.keyword": {
          order: sortBy,
        },
      },
      query: {
        bool: {},
      },
      from: 0,
      size,
      _source: {
        includes: [
          "name",
          "lastSyncedAt",
          "systems",
          "organizationDdVersion",
          "organizationDdStatus",
          "organizationWebApiVersion",
          "organizationWebApiStatus",
        ],
      },
    };
    if (searchKey) {
      uoiPayload.query.bool = {
        ...uoiPayload.query.bool,
        should: [
          {
            wildcard: {
              name: {
                value: `*${searchKey}*`,
                case_insensitive: true,
              },
            },
          },
          {
            wildcard: {
              uoi: {
                value: `*${searchKey}*`,
                case_insensitive: true,
              },
            },
          },
        ],
      };
    }
    const uoiResponse = await axios({
      method: "POST",
      baseURL: elasticUtils.baseUrl,
      url: "uoi/_search",
      data: uoiPayload,
      headers: headerOptions,
    });
    const uois = uoiResponse.data.hits.hits.map((uoi) => ({
      id: uoi._id,
      ...uoi._source,
    }));

    return uois;
  } catch (error) {
    logger.error(
      `Error while fetching organizations sorted ` +
        JSON.stringify(error.response?.data)
    );
    return Promise.reject(error);
  }
};

const getProviderAndRecipientNameByUoi = async (
  providerUoi,
  recipientUoi,
  headerOptions
) => {
  const orgsInfo = await Promise.props({
    providerOrg: await getOrganization(providerUoi, headerOptions),
    recipientOrg: await getOrganization(recipientUoi, headerOptions),
  });
  return {
    providerOrgName: orgsInfo.providerOrg.name,
    recipientOrgName: orgsInfo.recipientOrg.name,
  };
};

module.exports = {
  getOrganization,
  syncOrganization,
  searchOrganizationsWithNameandUoi,
  getProviderAndRecipientNameByUoi,
};

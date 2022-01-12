const logger = require("logger");
const utils = require("utils");
const elasticUtils = require("utils/elastic");
const _ = require("lodash");
const axios = require("axios");
const { reportTypes } = require("constants/reportTypes");
const dataDictionaryService = require("services/dataDictionary");
const webApiService = require("services/webApi");
const reportFieldsAndLookupsService = require("services/reportFieldsAndLookups");
const reportFilters = require("commonConstants/reportFilters");
const { standardMeta } = require("constants/standardMeta");
const { statusConstants } = require("commonConstants/certification");
const tokenUtils = require("utils/token");
const { CustomError } = require("utils/customError");
const emailServiceCancelled = require("services/email/cancelled");
const emailServiceRevoked = require("services/email/revoked");

const create = async (body, headerOptions, refresh = null) => {
  const isDataDictionary = reportTypes.DATA_DICTIONARY.name === body.type;
  const reportBody = isDataDictionary
    ? dataDictionaryService.getReportBody(body)
    : body;
  await checkIndices(headerOptions);
  const response = await axios({
    method: "POST",
    baseURL: elasticUtils.baseUrl,
    url: `/certification-report/_doc/${refresh ? "?refresh=wait_for" : ""}`,
    data: reportBody,
    headers: headerOptions,
  });
  const id = response.data._id;
  if (isDataDictionary) {
    await reportFieldsAndLookupsService.create(reportBody, id, headerOptions);
    // TODO remove the following code test purpose in intermediate stage
    // await payloadDataAvailabilityService.createReport(
    //   { ...body, _id: id },
    //   headerOptions
    // );
  }
  return { id };
};

const deleteReport = async (queryParams, headerOptions) => {
  try {
    const { id } = queryParams;
    const response = await axios({
      method: "DELETE",
      baseURL: elasticUtils.baseUrl,
      url: `/certification-report/_doc/${id}`,
      headers: headerOptions,
    });
    return { deletedReport: response.data._id };
  } catch (error) {
    logger.error("Error at deleteReport Service ", error);
    if (error.response && error.response.status === 404) {
      return { deletedReport: null };
    } else {
      throw new Error(error);
    }
  }
};

const update = async (body, id, headerOptions) => {
  const reportBody =
    reportTypes.DATA_DICTIONARY.name === body.type
      ? dataDictionaryService.getReportBody(body)
      : body;
  await checkIndices(headerOptions);
  const response = await axios({
    method: "PUT",
    baseURL: elasticUtils.baseUrl,
    url: `/certification-report/_doc/${id}`,
    data: reportBody,
    headers: headerOptions,
  });
  return { id: response.data._id };
};

const checkIndices = async (headerOptions) => {
  let indexExist = true;
  try {
    await axios({
      method: "HEAD",
      baseURL: elasticUtils.baseUrl,
      url: `/certification-report`,
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
    logger.info("Index already exists");
  } else {
    const thresholdProperties = {
      properties: {
        eqZero: {
          type: "integer",
        },
        gtZero: {
          type: "integer",
        },
        gte25: {
          type: "integer",
        },
        gte50: {
          type: "integer",
        },
        gte75: {
          type: "integer",
        },
        eq100: {
          type: "integer",
        },
      },
    };
    const binaryAvailabilityMapping = {
      reso: thresholdProperties,
      idx: thresholdProperties,
      local: thresholdProperties,
      total: thresholdProperties,
    };
    const body = {
      mappings: {
        properties: {
          fields: {
            type: "nested",
            properties: {
              availability: {
                type: "double",
              },
              frequency: {
                type: "integer",
              },
            },
          },
          lookups: {
            type: "nested",
          },
          parameters: {
            type: "nested",
          },
          generatedOn: {
            type: "date",
            format: "strict_date_optional_time_nanos",
          },
          statusUpdatedAt: {
            type: "date",
            format: "strict_date_optional_time_nanos",
          },
          lookupValues: {
            type: "nested",
            properties: {
              availability: {
                type: "double",
              },
              frequency: {
                type: "integer",
              },
            },
          },
          availability: {
            properties: {
              fields: {
                properties: binaryAvailabilityMapping,
              },
              lookups: {
                properties: binaryAvailabilityMapping,
              },
              resourcesBinary: {
                properties: {
                  lookups: {
                    properties: binaryAvailabilityMapping,
                  },
                  fields: {
                    properties: binaryAvailabilityMapping,
                  },
                },
              },
            },
          },
        },
      },
      settings: {
        "index.mapping.total_fields.limit": 200000,
        "index.mapping.nested_objects.limit": 200000,
        "index.max_inner_result_window": 20000,
      },
    };
    await axios({
      method: "PUT",
      baseURL: elasticUtils.baseUrl,
      url: `/certification-report`,
      data: body,
      headers: headerOptions,
    });
  }
};

const getAllReports = async (
  {
    endorsementFilter,
    statusFilter,
    showMyResults,
    providerUoi,
    uois,
    isPublic,
    isAdmin,
    from = 0,
  },
  headerOptions
) => {
  try {
    let reportCount = 0;
    let reports = [],
      reportsByOrgs = [],
      uoiOrgNameMapWhichHaveReportsToShow = [];
    const size = 20;
    let lastUoiIndex = from;
    let start = lastUoiIndex ? lastUoiIndex + 1 : 0;
    let filterClauses = [],
      statusClauses = [];
    if (uois.length) {
      const reportPayload = {
        query: {
          bool: {},
        },
        _source: {
          excludes: ["fields", "lookups"],
        },
      };
      //If the user have selected atleast one endorsement filter.
      if (endorsementFilter.length) {
        filterClauses = endorsementFilter.map((endorsementType) => {
          return {
            match: {
              type: endorsementType,
            },
          };
        });
      }
      //If the user has selected at least one statusFilter.
      if (statusFilter.length) {
        statusClauses = statusFilter.map((statusType) => {
          return {
            match: {
              status: statusType,
            },
          };
        });
      }
      // If the user is a public user or a normal user without providerUoi, show only "certified" reports.
      if (isPublic || !(isAdmin || providerUoi)) {
        statusClauses.push({
          match: {
            status: statusConstants.certified.value,
          },
        });
      }

      let slicedUois = uois.slice(start, start + size);
      while (slicedUois.length) {
        const uoiClauses = slicedUois.map((uoi) => {
          return {
            match: {
              "recipientUoi.keyword": uoi.id,
            },
          };
        });
        const paramScores = slicedUois.reduce((result, uoi, index) => {
          result[uoi.id] = index;
          return result;
        }, {});
        reportPayload.query.bool = {
          ...reportPayload.query.bool,
          must: [
            {
              bool: {
                should: uoiClauses,
                must_not: {
                  match: {
                    type: reportTypes.DATA_AVAILABILITY.name,
                  },
                },
              },
            },
            {
              bool: {
                should: filterClauses,
              },
            },
            {
              bool: {
                should: statusClauses,
              },
            },
          ],
        };
        //When the user is a normal user with providerUoi, show certified reports along with the reports having the respective providerUoi.
        if (!(isAdmin || isPublic) && providerUoi) {
          const normalUserClause = {
            bool: {
              should: [
                {
                  match: {
                    status: statusConstants.certified.value,
                  },
                },
                {
                  match: {
                    providerUoi,
                  },
                },
              ],
            },
          };
          reportPayload.query.bool.must.push(normalUserClause);

          //When the user is a normal user with providerUoi and switches to My Results, show only reports with respect to the providerUoi
          if (showMyResults) {
            const providerUoiClause = {
              match: {
                providerUoi,
              },
            };
            reportPayload.query.bool.must.push(providerUoiClause);
          }
        }

        //A custom script to sort certification reports based on the uois. The uois are scored as 0,1,2,3..... so that the script can follow it to sort the reports.
        reportPayload.sort = [
          {
            _script: {
              type: "number",
              script: {
                lang: "painless",
                source:
                  "if(params.scores.containsKey(doc['recipientUoi.keyword'].value)) { return params.scores[doc['recipientUoi.keyword'].value];} return 100000;",
                params: {
                  scores: paramScores,
                },
              },
              order: "asc",
            },
          },
        ];
        //A variable to track the last organization in the paginated list.
        //This will be helpful when the user scrolls in the infinite scroll and a new request hits to get the rest of the organization reports.
        lastUoiIndex = uois
          .map((uoi) => uoi.id)
          .indexOf(slicedUois[slicedUois.length - 1].id);
        let reportsData = await axios({
          method: "POST",
          baseURL: elasticUtils.baseUrl,
          url: "certification-report/_search?size=10000",
          data: reportPayload,
          headers: headerOptions,
        });
        //The elasticsearch returns result nested under hits of hits.
        reports = [
          ...reports,
          ...reportsData.data.hits.hits.map((hit) => {
            return { ...hit._source, id: hit._id };
          }),
        ];
        reportCount = reports.length;
        //Transforming the reports such that it is grouped based on it's organization.
        reportsByOrgs = reports.reduce((result, report) => {
          if (result[report.recipientUoi]) {
            result[report.recipientUoi] = [
              ...result[report.recipientUoi],
              report,
            ];
          } else {
            result[report.recipientUoi] = [report];
          }
          return result;
        }, {});
        uoiOrgNameMapWhichHaveReportsToShow = {
          ...uoiOrgNameMapWhichHaveReportsToShow,
          ...slicedUois.reduce((result, uoi) => {
            // if (Object.keys(reportsByOrgs).includes(uoi.id)) {
            result[uoi.id] = uoi.name;
            // }
            return result;
          }, {}),
        };
        start += size;
        //Since elasticsearch only supports a maximum of 1024 clauses for matching records,
        //slicing the uois into blocks of 1000 and quering certification reports associated with it.
        slicedUois = uois.slice(start, start + size);
        if (reportCount > 50) break;
      }
    }
    return { reportsByOrgs, uoiOrgNameMapWhichHaveReportsToShow, lastUoiIndex };
  } catch (error) {
    logger.error(
      `Error while fetching the list of reports in Elastic Service`,
      JSON.stringify(error?.response?.data)
    );
    return Promise.reject(utils.getErrorMessageFromElastic(error) || error);
  }
};

const summary = async (
  { recipientUoi, isPublic, token, reportId, reportType, providerUoi },
  headerOptions
) => {
  try {
    let report,
      decodedToken,
      isTokenVerified = false;
    if (token && reportId) {
      if (reportType === "data_dictionary") {
        report = (
          await dataDictionaryService.find({ id: reportId }, headerOptions)
        )?.report;
      } else if (reportType === "web_api_server_core") {
        report = (await webApiService.find({ id: reportId }, headerOptions))
          ?.report;
      }
      decodedToken = tokenUtils.verifyToken(token, {
        providerUoi: report.providerUoi,
        recipientUoi,
        passedDate: report.generatedOn,
        reportId,
      });
      isTokenVerified = !!(decodedToken?.recipientUoi === recipientUoi);
    }
    const queryClause = {
      bool: {
        must: [
          {
            match: {
              recipientUoi,
            },
          },
        ],
        must_not: {
          match: {
            type: reportTypes.DATA_AVAILABILITY.name,
          },
        },
      },
    };
    if (providerUoi) {
      queryClause.bool.must.push({
        bool: {
          should: [
            {
              match: {
                providerUoi,
              },
            },
            {
              match: {
                status: statusConstants.certified.value,
              },
            }]
        }
      });
    }
    const summary = await axios({
      method: "POST",
      baseURL: elasticUtils.baseUrl,
      url: "certification-report/_search",
      data: {
        query: queryClause,
        _source: {
          excludes: ["fields", "lookups", "parameters"],
        },
      },
      headers: headerOptions,
    });
    return summary.data.hits.hits.reduce((result, hit) => {
      if (isPublic) {
        if (
          isTokenVerified ||
          hit._source?.status === statusConstants.certified.value
        ) {
          result.push({ ...hit._source, id: hit._id });
        }
      } else {
        result.push({ ...hit._source, id: hit._id });
      }
      return result;
    }, []);
  } catch (error) {
    logger.error(
      `Error while fetching the list of reports in Elastic Service`,
      error.response
    );
    return Promise.reject(error);
  }
};

const marketAverage = async (type, headerOptions) => {
  try {
    const response = await axios({
      method: "POST",
      baseURL: elasticUtils.baseUrl,
      url: "certification-report/_search?size=0",
      data: {
        aggs: {
          filterByTypeAndVersion: {
            filter: {
              bool: {
                must: [
                  {
                    match: {
                      type: "data_dictionary",
                    },
                  },
                  {
                    match: {
                      version: "1.7",
                    },
                  },
                ],
                must_not: [
                  {
                    match: {
                      recipientUoi: "T00000012",
                    },
                  },
                ],
              },
            },
            aggs: {
              standardFieldsAverage: {
                avg: {
                  field: `standardFieldsCount`,
                },
              },
              localFieldsAverage: {
                avg: {
                  field: `localFieldsCount`,
                },
              },
              totalFieldsAverage: {
                avg: {
                  field: `totalFieldsCount`,
                },
              },
              standardLookupsAverage: {
                avg: {
                  field: `standardLookupsCount`,
                },
              },
              localLookupsAverage: {
                avg: {
                  field: `localLookupsCount`,
                },
              },
              totalLookupsAverage: {
                avg: {
                  field: `totalLookupsCount`,
                },
              },
              idxFieldsAverage: {
                avg: {
                  field: `iDXFieldsCount`,
                },
              },
              idxLookupsAverage: {
                avg: {
                  field: `iDXLookupsCount`,
                },
              },
            },
          },
        },
      },
      headers: headerOptions,
    });
    const {
      doc_count: docCount,
      standardFieldsAverage: { value: standardFieldsAverage },
      totalFieldsAverage: { value: totalFieldsAverage },
      standardLookupsAverage: { value: standardLookupsAverage },
      localFieldsAverage: { value: localFieldsAverage },
      totalLookupsAverage: { value: totalLookupsAverage },
      localLookupsAverage: { value: localLookupsAverage },
      idxLookupsAverage: { value: idxLookupsAverage },
      idxFieldsAverage: { value: idxFieldsAverage },
    } = response.data.aggregations.filterByTypeAndVersion;

    return {
      docCount,
      standardMeta: dataDictionaryService.getIDXcounts(
        standardMeta.fields,
        standardMeta.lookups
      ),
      fields: {
        total: totalFieldsAverage,
        reso: standardFieldsAverage,
        idx: idxFieldsAverage,
        local: localFieldsAverage,
      },
      lookups: {
        total: totalLookupsAverage,
        reso: standardLookupsAverage,
        idx: idxLookupsAverage,
        local: localLookupsAverage,
      },
    };
  } catch (error) {
    logger.error(
      `Error while fetching industry average in Elastic Service`,
      error.response
    );
    return Promise.reject(error);
  }
};

const getCertificationCounts = async (
  { isPublic, providerUoi, isAdmin, showMyResults },
  headerOptions
) => {
  try {
    let filters = {};
    reportFilters.endorsementOptions.forEach((endorsement) => {
      if (endorsement.value) {
        filters[endorsement.value] = {
          filter: {
            bool: {
              must: [
                {
                  match: {
                    type: endorsement.value,
                  },
                },
              ],
            },
          },
        };
      }
    });
    reportFilters.statusOptions.forEach((status) => {
      if (status.value) {
        filters[status.value] = {
          filter: {
            bool: {
              must: [
                {
                  match: {
                    status: status.value,
                  },
                },
              ],
            },
          },
        };
      }
    });
    const certificationCountPayload = {
      aggs: {
        all: {
          filter: {
            bool: {
              must_not: {
                match: {
                  type: reportTypes.DATA_AVAILABILITY.name,
                },
              },
            },
          },
        },
        ...filters,
      },
    };
    const queryClauses = [];
    // If the user is a public user or a normal user without providerUoi, count only "certified" reports.
    if (isPublic || !(isAdmin || providerUoi)) {
      queryClauses.push({
        match: {
          status: statusConstants.certified.value,
        },
      });
    }
    //When the user is a normal user with providerUoi, count certified reports along with the reports having the respective providerUoi.
    if (!(isAdmin || isPublic) && providerUoi) {
      const normalUserClause = {
        bool: {
          should: [
            {
              match: {
                status: statusConstants.certified.value,
              },
            },
            {
              match: {
                providerUoi,
              },
            },
          ],
        },
      };
      queryClauses.push(normalUserClause);

      //When the user is a normal user with providerUoi and switches to My Results, count only reports with respect to the providerUoi
      if (showMyResults === "true") {
        const providerUoiClause = {
          match: {
            providerUoi,
          },
        };
        queryClauses.push(providerUoiClause);
      }
    }

    if (queryClauses.length) {
      certificationCountPayload.query = {
        bool: {
          must: queryClauses,
        },
      };
    }
    const response = await axios({
      method: "POST",
      baseURL: elasticUtils.baseUrl,
      url: "certification-report/_search?size=0",
      data: certificationCountPayload,
      headers: headerOptions,
    });
    return Object.entries(response.data.aggregations).reduce(
      (result, [agg, value]) => {
        result[agg] = value.doc_count;
        return result;
      },
      {}
    );
  } catch (error) {
    logger.error(
      `Error while fetching certificatiion counts Elastic Service`,
      error.response
    );
    return Promise.reject(error);
  }
};

const getReportWithIdAndType = async ({ id, type }, headerOptions) => {
  let report = null;
  if (type === "data_dictionary") {
    report = (await dataDictionaryService.find({ id }, headerOptions))?.report;
  } else if (type === "web_api_server_core") {
    report = (await webApiService.find({ id }, headerOptions))?.report;
  }
  return report;
};

const verifyAuthorizationForReportStatusUpdate = async (
  { id, type, token },
  headerOptions
) => {
  try {
    let report = null,
      decodedToken,
      isAuthorized = false;
    const adminAuthorization = `Basic ${utils.adminCredentialsEncoded}`;
    if (token) {
      report = await getReportWithIdAndType(
        { id, type },
        { Authorization: adminAuthorization }
      );
      decodedToken = tokenUtils.verifyToken(token, {
        providerUoi: report.providerUoi,
        recipientUoi: report.recipientUoi,
        passedDate: report.generatedOn,
        reportId: id,
      });
      isAuthorized = !!(decodedToken?.reportId === id);
    } else if (headerOptions.Authorization) {
      //To verify whether the provider has a valid apikey with him so that we can proceed to grant the adminAuthorization to update the status
      report = await getReportWithIdAndType({ id, type }, headerOptions);
      isAuthorized = true;
    }
    if (isAuthorized) {
      return { headerOptions: { Authorization: adminAuthorization }, report };
    } else {
      throw new CustomError("Authorization Failed", 401);
    }
  } catch (error) {
    return Promise.reject(error);
  }
};

const updateStatus = async (
  existingReport,
  { id, status, statusUpdatedAt, recipientEmail },
  headerOptions
) => {
  const payload = {
    doc: {
      status,
      statusUpdatedAt,
    },
    doc_as_upsert: true,
  };
  if (status === statusConstants.recipient_notified.value) {
    payload.doc.notificationCount = existingReport.notificationCount + 1;
    if (recipientEmail) {
      payload.doc.recipientEmail = recipientEmail;
    }
  } else if (status === statusConstants.passed.value) {
    // To reset back the notification count when the admin toggles the status to passed.
    payload.doc.notificationCount = 0;
  } else if (status === statusConstants.cancelled.value) {
    await emailServiceCancelled.sendEmail(existingReport, headerOptions);
  } else if (status === statusConstants.revoked.value) {
    await emailServiceRevoked.sendEmail(existingReport, headerOptions);
  }
  const { data } = await axios({
    method: "POST",
    baseURL: elasticUtils.baseUrl,
    url: `/certification-report/_update/${id}`,
    data: payload,
    headers: headerOptions,
  });
  return { data };
};

const getCertification = async (body, headerOptions) => {
  try {
    const certification = await axios({
      method: "POST",
      baseURL: elasticUtils.baseUrl,
      url: "certification-report/_search",
      data: {
        query: {
          bool: {
            must: [
              {
                match: {
                  version: body.version,
                },
              },
              {
                match: {
                  type: body.type,
                },
              },
              {
                match: {
                  recipientUoi: body.recipientUoi,
                },
              },
              {
                match: {
                  providerUoi: body.providerUoi,
                },
              },
            ],
          },
        },
        _source: {
          excludes: ["fields", "lookups", "parameters"],
        },
      },
      headers: headerOptions,
    });
    return certification.data.hits.hits[0];
  } catch (error) {
    logger.error(
      "Error while fetching existing certification => ",
      utils.getErrorMessageFromElastic(error) || error
    );
    return null;
  }
};

const getReportsByProvider = async (providerUoi, type, headerOptions) => {
  try {
    const reports = await axios({
      method: "POST",
      baseURL: elasticUtils.baseUrl,
      url: "certification-report/_search?size=10000",
      data: {
        query: {
          bool: {
            must: [
              {
                match: {
                  providerUoi,
                },
              },
              {
                match: {
                  type,
                },
              },
            ],
          },
        },
        _source: {
          excludes: ["fields", "lookups", "parameters", "advertised"],
        },
      },
      headers: headerOptions,
    });
    return reports.data.hits.hits?.map((report) => report._source);
  } catch (error) {
    logger.error(
      "Error while fetching reports of the provider => ",
      utils.getErrorMessageFromElastic(error) || error
    );
    return null;
  }
};

module.exports = {
  create,
  deleteReport,
  update,
  getAllReports,
  summary,
  marketAverage,
  getCertificationCounts,
  verifyAuthorizationForReportStatusUpdate,
  updateStatus,
  getCertification,
  getReportWithIdAndType,
  getReportsByProvider,
};

const { standardMeta } = require("constants/standardMeta");
const { standardResources } = require("commonConstants/standardResources");
const utils = require("utils");
const elasticUtils = require("utils/elastic");
const axios = require("axios");
const { lookupMap } = require("constants/lookupMap");
const logger = require("logger");
const tokenUtils = require("utils/token");
const { reportTypes } = require("constants/reportTypes");

const find = async ({ id, token }, headerOptions) => {
  try {
    const response = await axios({
      method: "GET",
      baseURL: elasticUtils.baseUrl,
      url: `/certification-report/_doc/${id}?_source_excludes=lookups`,
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
    return {
      report: { ...response.data._source, id },
      isTokenVerified,
    };
  } catch (error) {
    return Promise.reject(utils.getErrorMessageFromElastic(error) || error);
  }
};

const getReportBody = (body) => {
  const { fields, lookups } = body;
  const filteredLookups = lookups.filter(
    (lookup) => !lookup.lookupValue.startsWith("Sample")
  );
  const transformedBody = {
    ...body,
    fields: getTransformedFields(fields),
    lookups: getTransformedLookups(filteredLookups),
  };
  return {
    ...transformedBody,
    ...getFieldsCount(fields),
    ...getResourcesCount(fields),
    ...getLookupsCount(transformedBody.lookups),
    ...getIDXcounts(fields, filteredLookups),
    advertised: getAdvertisedCountPerResourcesByType(transformedBody),
  };
};

const getTransformedFields = (fields) => {
  return fields.map((field) => {
    return {
      ...field,
      standardRESO: standardMeta.fields.some(
        (x) =>
          x.resourceName === field.resourceName &&
          x.fieldName === field.fieldName
      ),
      payloads: standardMeta.fields.find(
        (x) =>
          x.resourceName === field.resourceName &&
          x.fieldName === field.fieldName
      )?.payloads,
    };
  });
};
const getTransformedLookups = (lookups) => {
  return lookups.map((lookup) => {
    const { standardRESO, standardDisplayName } = getResoLookup(lookup);
    return standardDisplayName
      ? { ...lookup, standardRESO, standardDisplayName }
      : { ...lookup, standardRESO };
  });
};

const getIDXcounts = (fields, lookups) => {
  // iDXFields
  const iDXFields = fields.filter((field) =>
    standardMeta.fields.some(
      (x) =>
        x.resourceName === field.resourceName &&
        x.fieldName === field.fieldName &&
        x.payloads.includes("IDX")
    )
  );
  const iDXFieldsCount = iDXFields.length;

  // iDXResources
  const resources = [...new Set(fields.map((field) => field.resourceName))];
  const iDXResourcesCount = resources.filter((resource) =>
    standardMeta.fields.some(
      (x) => x.resourceName === resource && x.payloads.includes("IDX")
    )
  ).length;

  /*  iDXLookups
  lookups of unique IDX fields with any of types ["String List, Single", String List, Multi] 
  */
  const iDXLookups = getIdxLookups(fields, lookups);
  const iDXLookupsCount = iDXLookups.length;
  return { iDXFieldsCount, iDXResourcesCount, iDXLookupsCount };
};

const getLastPart = (str, char) => str.substr(str.lastIndexOf(char) + 1);

const getFieldsCount = (fields) => {
  const standardFieldsCount = fields.filter((field) =>
    standardMeta.fields.some(
      (x) =>
        x.resourceName === field.resourceName && x.fieldName === field.fieldName
    )
  ).length;
  const localFieldsCount = fields.length - standardFieldsCount;
  return {
    standardFieldsCount,
    localFieldsCount,
    totalFieldsCount: fields.length,
  };
};

const getResourcesCount = (fields) => {
  const resources = [...new Set(fields.map((field) => field.resourceName))];
  const totalResourcesCount = resources.length;
  const standardResourcesCount = resources.filter((resource) =>
    standardResources.some((x) => x === resource)
  ).length;
  const localResourcesCount = totalResourcesCount - standardResourcesCount;
  return { standardResourcesCount, localResourcesCount, totalResourcesCount };
};

const getLookupsCount = (lookups) => {
  const standardLookupsCount = lookups.filter(
    (lookup) => lookup.standardRESO === true
  ).length;
  const localLookupsCount = lookups.length - standardLookupsCount;
  return {
    standardLookupsCount,
    localLookupsCount,
    totalLookupsCount: lookups.length,
  };
};

const getResources = async (id, filter, headerOptions) => {
  /*To support reso local filtering , combining filtering aggregation and terms aggregation*/
  const distinctResources = {
    distinct_resources: {
      terms: {
        field: "fields.resourceName.keyword",
        size: 50,
      },
    },
  };
  let aggsCondition = {};
  if (filter) {
    aggsCondition = {
      filteredFields: {
        filter: { term: { "fields.standardRESO": filter === "reso" } },
        aggs: distinctResources,
      },
    };
    if (filter === "IDX") {
      aggsCondition = {
        filteredFields: {
          filter: {
            bool: {
              filter: [
                { term: { "fields.standardRESO": filter === "IDX" } },
                { match: { "fields.payloads": filter } },
              ],
            },
          },
          aggs: distinctResources,
        },
      };
    }
  } else {
    aggsCondition = distinctResources;
  }
  const { data } = await axios({
    method: "POST",
    baseURL: elasticUtils.baseUrl,
    url: "certification-report/_search",
    data: {
      query: {
        match: {
          _id: id,
        },
      },
      aggs: {
        aggs_fields: {
          nested: {
            path: "fields",
          },
          aggs: aggsCondition,
        },
      },
      size: 0,
    },
    headers: headerOptions,
  });
  let aggs_fields = data.aggregations.aggs_fields;
  aggs_fields = filter ? aggs_fields.filteredFields : aggs_fields;
  return aggs_fields.distinct_resources.buckets;
};

const getFields = async ({ id, resource, count, filter, headerOptions }) => {
  const matchCondition = [
    {
      match: {
        "fields.resourceName": resource,
      },
    },
  ];
  if (filter) {
    matchCondition.push({
      match: {
        "fields.standardRESO": filter === "reso" || filter === "IDX",
      },
    });
    if (filter === "IDX") {
      matchCondition.push({
        match: {
          "fields.payloads": filter,
        },
      });
    }
  }
  const { data } = await axios({
    method: "POST",
    baseURL: elasticUtils.baseUrl,
    url: "certification-report/_search",
    data: {
      query: {
        bool: {
          must: [
            {
              match: {
                _id: id,
              },
            },
            {
              nested: {
                path: "fields",
                query: {
                  bool: {
                    must: matchCondition,
                  },
                },
                inner_hits: {
                  size: count,
                },
              },
            },
          ],
        },
      },
      _source: {
        excludes: ["fields", "lookups"],
      },
    },
    headers: headerOptions,
  });
  return data.hits.hits[0].inner_hits.fields.hits.hits.map(
    (field) => field._source
  );
};

const getFieldsBySearch = async ({ id, searchKey, filter, headerOptions }) => {
  try {
    const wildcard = {
      wildcard: {
        "fields.fieldName": {
          value: `*${searchKey}*`,
          case_insensitive: true,
        },
      },
    };
    let queryCondition = {};
    if (filter) {
      queryCondition = {
        bool: {
          must: [
            wildcard,
            {
              match: {
                "fields.standardRESO": filter === "reso" || filter === "IDX",
              },
            },
          ],
        },
      };
      if (filter === "IDX") {
        queryCondition = {
          bool: {
            must: [
              wildcard,
              {
                match: {
                  "fields.payloads": filter,
                },
              },
            ],
          },
        };
      }
    } else {
      queryCondition = wildcard;
    }
    const { data } = await axios({
      method: "POST",
      baseURL: elasticUtils.baseUrl,
      url: "certification-report/_search",
      data: {
        query: {
          bool: {
            must: [
              {
                match: {
                  _id: id,
                },
              },
              {
                nested: {
                  path: "fields",
                  query: queryCondition,
                  //maximum limit of fields to be returned
                  inner_hits: {
                    size: 1000,
                  },
                },
              },
            ],
          },
        },
        _source: {
          excludes: ["fields", "lookups"],
        },
      },
      headers: headerOptions,
    });
    let result = [];
    if (data.hits.hits.length) {
      result = data.hits.hits[0].inner_hits.fields.hits.hits.map(
        (field) => field._source
      );
    }
    return result;
  } catch (error) {
    logger.error(
      `Error while fetching fields by search in Elastic Service`,
      JSON.stringify(error?.response?.data)
    );
    return Promise.reject(utils.getErrorMessageFromElastic(error) || error);
  }
};

const getLookups = async ({
  id,
  lookupName,
  from,
  size,
  filter,
  headerOptions,
}) => {
  const matchCondition = [
    {
      match: {
        "lookups.lookupName": lookupName,
      },
    },
  ];
  if (filter) {
    matchCondition.push({
      match: {
        "lookups.standardRESO": filter === "reso",
      },
    });
  }
  const { data } = await axios({
    method: "POST",
    baseURL: elasticUtils.baseUrl,
    url: "certification-report/_search",
    data: {
      query: {
        bool: {
          must: [
            {
              match: {
                _id: id,
              },
            },
            {
              nested: {
                path: "lookups",
                query: {
                  bool: {
                    must: matchCondition,
                  },
                },
                inner_hits: {
                  from: from,
                  size: size,
                },
              },
            },
          ],
        },
      },
      _source: {
        excludes: ["fields", "lookups"],
      },
    },
    headers: headerOptions,
  });
  let lookups = !data.hits.hits.length
    ? []
    : data.hits.hits[0].inner_hits.lookups.hits.hits.map(
        (lookup) => lookup._source
      );
  lookups = lookups.map((lookup) => {
    const { lookupName, lookupValue, annotations } = lookup;
    let standardLookup = standardMeta.lookups.find(
      (x) => x.lookupName === lookupName && x.lookupValue === lookupValue
    );
    if (!standardLookup) {
      //not a standard lookup as per metadata JSON
      const mapLookupName = lookupName.substr(lookupName.lastIndexOf(".") + 1);
      //checking is it  standard lookup from map
      const lookupMapValueList = lookupMap[mapLookupName];
      if (lookupMapValueList?.length) {
        if (annotations?.length) {
          standardLookup = lookupMapValueList.find(
            (x) => x.lookupDisplayName === annotations[0].value
          );
        }
        if (!standardLookup) {
          standardLookup = lookupMapValueList.find(
            (x) => x.lookupDisplayName === lookupValue
          );
          if (!standardLookup) {
            standardLookup = lookupMapValueList.find(
              (x) => x.lookupValue.toLowerCase() === lookupValue.toLowerCase()
            );
          }
        }
      }
    }
    return {
      ...lookup,
      wikiPageURL: standardLookup?.wikiPageURL,
    };
  });
  return lookups;
};

const getLookupsCountByType = async ({ id, lookupName, headerOptions }) => {
  const { data } = await axios({
    method: "POST",
    baseURL: elasticUtils.baseUrl,
    url: "certification-report/_search",
    data: {
      query: {
        bool: {
          must: [
            {
              match: {
                _id: id,
              },
            },
          ],
        },
      },
      aggs: {
        aggs_lookups: {
          nested: {
            path: "lookups",
          },
          aggs: {
            reso: {
              filter: {
                bool: {
                  must: [
                    {
                      match: {
                        "lookups.standardRESO": true,
                      },
                    },
                    {
                      match: {
                        "lookups.lookupName": lookupName,
                      },
                    },
                  ],
                },
              },
            },
            local: {
              filter: {
                bool: {
                  must: [
                    {
                      match: {
                        "lookups.standardRESO": false,
                      },
                    },
                    {
                      match: {
                        "lookups.lookupName": lookupName,
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
      size: 0,
    },
    headers: headerOptions,
  });

  return data.aggregations.aggs_lookups;
};

const getFieldDetails = async (fieldName, resourceName) => {
  return standardMeta.fields.find(
    (field) =>
      field.fieldName === fieldName && field.resourceName === resourceName
  );
};

//method will return standardRESO and standardDisplayName
const getResoLookup = (lookup) => {
  const { lookupName, lookupValue, annotations } = lookup;
  let standardDisplayName = null;
  let standardRESO = standardMeta.lookups.some(
    (x) => x.lookupName === lookupName && x.lookupValue === lookupValue
  );
  if (!standardRESO) {
    //not a standard lookup as per metadata JSON
    const mapLookupName = lookupName.substr(lookupName.lastIndexOf(".") + 1);
    //checking is it  standard lookup from map
    const lookupMapValueList = lookupMap[mapLookupName];
    if (lookupMapValueList?.length) {
      if (annotations?.length) {
        standardRESO = lookupMapValueList.some(
          (x) => x.lookupDisplayName === annotations[0].value
        );
      }
      if (!standardRESO) {
        standardRESO = lookupMapValueList.some(
          (x) => x.lookupDisplayName === lookupValue
        );
        if (!standardRESO) {
          const lookupMapValue = lookupMapValueList.find(
            (x) => x.lookupValue.toLowerCase() === lookupValue.toLowerCase()
          );
          if (lookupMapValue) {
            standardRESO = true;
            standardDisplayName = lookupMapValue.lookupDisplayName;
          }
        }
      }
    }
  }
  return { standardRESO, standardDisplayName };
};

const isResoLookup = (lookup) => {
  const { standardRESO } = getResoLookup(lookup);
  return standardRESO;
};

const isIdxField = (field) => {
  return standardMeta.fields.some(
    (x) =>
      x.resourceName === field.resourceName &&
      x.fieldName === field.fieldName &&
      x.payloads.includes("IDX")
  );
};

const isResoField = (field) => {
  return standardMeta.fields.some(
    (x) =>
      x.resourceName === field.resourceName && x.fieldName === field.fieldName
  );
};

const getIdxLookups = (fields, lookups) => {
  const iDXDataTypes = [
    "String List, Multi",
    "String List,Multi",
    "String List, Single",
    "String List,Single",
  ];
  const iDXLookupFields = fields.filter((field) =>
    standardMeta.fields.some(
      (x) =>
        x.resourceName === field.resourceName &&
        x.fieldName === field.fieldName &&
        x.payloads.includes("IDX") &&
        iDXDataTypes.includes(x.simpleDataType?.trim())
    )
  );
  const uniqueIDXLookupFields = [
    ...new Set(iDXLookupFields.map((field) => field.type)),
  ];
  const standardLookups = standardMeta.lookups;
  return lookups.filter((lookup) => {
    return uniqueIDXLookupFields.some(
      (field) =>
        field === lookup.lookupName &&
        standardLookups.some(
          (sLookup) =>
            sLookup.lookupValue === lookup.lookupValue &&
            getLastPart(sLookup.lookupName, ".") ===
              getLastPart(lookup.lookupName, ".")
        )
    );
  });
};

const isIdxLookup = (fields, lookups, lookup) => {
  return getIdxLookups(fields, lookups).some(
    (idxLookup) =>
      idxLookup.lookupName === lookup.lookupName &&
      (idxLookup.lookupValue === lookup.lookupValue ||
        idxLookup?.annotations?.[0]?.value === lookup?.annotations?.[0]?.value)
  );
};

const isIdxResource = (resource) => {
  return standardMeta.fields.some(
    (x) => x.resourceName === resource && x.payloads.includes("IDX")
  );
};

const getAdvertisedCountPerResourcesByType = ({ fields, lookups }) => {
  const reducedFields = fields.reduce(function (r, a) {
    r[a.resourceName] = r[a.resourceName] || [];
    r[a.resourceName].push(a);
    return r;
  }, Object.create(null));
  let advertisedCount = {};
  const idxLookups = getIdxLookups(fields, lookups);
  for (const [key, value] of Object.entries(reducedFields)) {
    advertisedCount[key] = { fields: {}, lookups: {} };
    advertisedCount[key]["fields"] = { total: 0, reso: 0, idx: 0, local: 0 };
    advertisedCount[key]["lookups"] = { total: 0, reso: 0, idx: 0, local: 0 };
    let lookupsCollection = [];
    for (const field of value) {
      advertisedCount[key]["fields"].total++;
      if (field.standardRESO) {
        advertisedCount[key]["fields"].reso++;
        if (field?.payloads?.includes("IDX")) {
          advertisedCount[key]["fields"].idx++;
        }
      } else {
        advertisedCount[key]["fields"].local++;
      }
      //collect lookup on single pass
      if (!field?.type.startsWith("Edm.")) {
        lookupsCollection.push(
          ...lookups.filter((lookup) => lookup.lookupName === field.type)
        );
      }
    }
    for (const lookup of lookupsCollection) {
      advertisedCount[key]["lookups"].total++;
      if (lookup.standardRESO) {
        advertisedCount[key]["lookups"].reso++;
        if (
          idxLookups.some(
            (idxLookup) =>
              idxLookup.lookupName === lookup.lookupName &&
              (idxLookup.lookupValue === lookup.lookupValue ||
                idxLookup?.annotations?.[0]?.value ===
                  lookup?.annotations?.[0]?.value)
          )
        ) {
          advertisedCount[key]["lookups"].idx++;
        }
      } else {
        advertisedCount[key]["lookups"].local++;
      }
    }
  }
  return advertisedCount;
};

const getAdvertisedAverage = async (headerOptions) => {
  const aggAdvertised = {};
  const advertisedTypes = ["reso", "idx", "local", "total"];
  const advertisedAttributes = ["fields", "lookups"];
  for (const resource of standardResources) {
    for (const attribute of advertisedAttributes) {
      for (const type of advertisedTypes) {
        aggAdvertised[`${resource}_${attribute}_${type}`] = {
          avg: {
            field: `advertised.${resource}.${attribute}.${type}`,
          },
        };
      }
    }
  }

  const aggResponse = await axios({
    method: "POST",
    baseURL: elasticUtils.baseUrl,
    url: `/certification-report/_search?size=0`,
    data: {
      aggs: aggAdvertised,
      query: {
        match: {
          type: reportTypes.DATA_DICTIONARY.name,
        },
      },
    },
    headers: headerOptions,
  });
  const aggAdvertisedResults = aggResponse.data.aggregations;
  const advertisedAverage = {};
  for (const [key, value] of Object.entries(aggAdvertisedResults)) {
    if (value?.value) {
      const [resource, attribute, type] = key.split("_");
      advertisedAverage[resource] = {
        ...advertisedAverage?.[resource],
        [attribute]: {
          ...advertisedAverage?.[resource]?.[attribute],
          [type]: value.value,
        },
      };
    }
  }
  return advertisedAverage;
};

module.exports = {
  find,
  getReportBody,
  getResources,
  getFields,
  getFieldsBySearch,
  getLookups,
  getLookupsCountByType,
  getFieldDetails,
  getFieldsCount,
  getResourcesCount,
  getLookupsCount,
  getTransformedFields,
  getTransformedLookups,
  getIDXcounts,
  isResoLookup,
  isIdxField,
  isResoField,
  isIdxLookup,
  isIdxResource,
  getAdvertisedAverage,
};

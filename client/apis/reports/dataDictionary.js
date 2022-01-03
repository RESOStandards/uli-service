import axios from "axios";
/*
@DDBaseUrl means Data Dictionary Base Url 
 */
const DDBaseUrl = "/api/v1/certification_reports/data_dictionary";

export const getReport = (id, { token, providerUoi }) =>
  axios.get(`${DDBaseUrl}/${id}`, {
    params: {
      token,
      providerUoi,
    },
  });

export const getResources = (id, filter = null) => {
  let url = `${DDBaseUrl}/${id}/resources`;
  if (filter) {
    url = `${url}?filter=${filter}`;
  }
  return axios.get(url);
};

export const getFields = (id, resource, count, filter) => {
  let url = `${DDBaseUrl}/${id}/fields/${resource}/${count}`;
  if (filter) {
    url = `${url}?filter=${filter}`;
  }
  return axios.get(url);
};

export const getLookups = (id, lookup, from, size, filter = null) => {
  let url = `${DDBaseUrl}/${id}/lookups/${lookup}?from=${from}&size=${size}`;
  if (filter) {
    url = `${url}&filter=${filter}`;
  }
  return axios.get(url);
};

export const getFieldsBySearch = (id, searchKey, filter) => {
  let url = `${DDBaseUrl}/${id}/fields/${searchKey}`;
  if (filter) {
    url = `${url}?filter=${filter}`;
  }
  return axios.get(url);
};

export const getLookupsCount = (id, lookup) =>
  axios.get(`${DDBaseUrl}/${id}/lookups/${lookup}/count`);

export const getFieldDetails = (field, resource) =>
  axios.get(`${DDBaseUrl}/resources/${resource}/fields/${field}`);

export const getAdvertisedAverage = () =>
  axios.get(`${DDBaseUrl}/advertised-average`);

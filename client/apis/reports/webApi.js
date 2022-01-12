import axios from "axios";

const webApiBaseUrl = "/api/v1/certification_reports/web_api";

export const getReport = (id, { token, providerUoi }) =>
  axios.get(`${webApiBaseUrl}/${id}`, {
    params: {
      token,
      providerUoi,
    },
  });

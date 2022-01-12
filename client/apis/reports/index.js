import axios from "axios";

export const fetchReports = (options) =>
  axios.post(`/api/v1/certification_reports/filter`, { options });

export const getSummary = ({
  recipientUoi,
  token,
  reportMetadata,
  providerUoi,
}) =>
  axios.get(`/api/v1/certification_reports/summary/${recipientUoi}`, {
    params: {
      token,
      reportId: reportMetadata.id,
      reportType: reportMetadata.type,
      providerUoi,
    },
  });

export const getMarketAverage = (type = "data_dictionary") =>
  axios.get(`/api/v1/certification_reports/market-average/${type}`);

export const getCertificationCounts = ({ showMyResults, providerUoi }) =>
  axios.get(`/api/v1/certification_reports/certification-count`, {
    params: {
      showMyResults,
      providerUoi,
    },
  });

export const getReportsByProvider = (providerUoi, type) =>
  axios.get(`/api/v1/certification_reports/provider/${providerUoi}`, {
    params: {
      type,
    },
  });

export const updateReportStatus = ({
  id,
  type,
  status,
  recipientEmail,
  token,
}) =>
  axios.patch(
    `/api/v1/certification_reports/status/${id}`,
    {
      status,
      recipientEmail,
    },
    {
      params: {
        type,
        token,
      },
    }
  );

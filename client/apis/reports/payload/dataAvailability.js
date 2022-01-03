import axios from "axios";
/*
@DDBaseUrl means Data Dictionary Base Url 
 */
const DataAvailabilityBaseUrl = "/api/v1/payload/data_availability";


export const getDataAvailabilityReport = (reportId) =>
  axios.get(`${DataAvailabilityBaseUrl}/${reportId}`);

export const getDataAvailabilitiesAndAverage = (reportIds) =>
  axios.post(`${DataAvailabilityBaseUrl}/market-average`, {
    reportIds
  });

export const getMarketAvailability = (reportId) =>
  axios.get(`${DataAvailabilityBaseUrl}/market-availability/${reportId}`);

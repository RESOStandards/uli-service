import axios from "axios";
/*
@DDBaseUrl means Data Dictionary Base Url 
 */
const PerformanceBaseUrl = "/api/v1/payload/performance";


export const getProviderMetrics = (reportId) =>
  axios.get(`${PerformanceBaseUrl}/provider-metrics/${reportId}`);
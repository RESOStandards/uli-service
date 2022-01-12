import axios from "axios";

export const getTermsAndConditions = () =>
  axios.get(`/api/v1/certification/terms`);

export const notifyRecipient = (payload) =>
  axios.post(`/api/v1/certification/recipient/notify`, payload);

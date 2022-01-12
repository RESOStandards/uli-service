import axios from "axios";

export const fetchAllOrganizations = () =>
  axios.get(`/api/v1/organization/all`);

export const fetchOrganization = (uoi) =>
  axios.get(`/api/v1/organization?uoi=${uoi}`);

export const syncOrganization = () => axios.post(`/api/v1/organization/sync`);

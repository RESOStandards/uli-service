import axios from "axios";

export const createToken = (username) =>
  axios.post(`/api/v1/token/create?username=${username}`);

export const createAdminToken = (username, password) =>
  axios.post(`/api/v1/token/admin/create`, { username, password });

export const listAdminApiKeys = (username) =>
  axios.get(`/api/v1/token/admin/list?username=${username}`);

export const deleteToken = (username, tokenId) =>
  axios.delete(`/api/v1/token/delete?username=${username}&tokenId=${tokenId}`);

export const deleteAdminToken = (username, tokenId) =>
  axios.delete(
    `/api/v1/token/admin/delete?username=${username}&tokenId=${tokenId}`
  );

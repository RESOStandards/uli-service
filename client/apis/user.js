import axios from "axios";

export const createUser = (newUser, isAdmin) =>
  axios.post("/api/v1/user/create", { newUser, isAdmin });

export const listUsers = () => axios.get("/api/v1/user/list");

export const deleteUser = (username) =>
  axios.delete("/api/v1/user/delete", { data: { username } });

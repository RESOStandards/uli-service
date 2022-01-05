import axios from "axios";

export const login = (payload) => axios.post("/api/v1/account/login", payload);

export const logout = () => axios.delete("/api/v1/account/logout");

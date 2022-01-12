import axios from "axios";
import { Toastr } from "components/common";
import get from "lodash/get";
import { persistAuthInfo, removeAuthInfo } from "helpers/auth";

axios.defaults.headers = {
  Accept: "application/json",
  "Content-Type": "application/json",
  authenticated: false,
};

export const setAxiosIntercepts = (setAuthenticated) => {
  axios.interceptors.response.use(
    function (response) {
      if (response.status === 200) {
        response.success = true;
      }
      if (response.data.notice) {
        Toastr.info(response.data.notice);
      }
      return response;
    },
    function (error) {
      if (401 === error?.response?.status) {
        setAuthenticated(false);
        Toastr.error("Unauthorized request. Logging out...");
        window.location.href = "/login";
        return Promise.reject(error);
      } else {
        Toastr.error(get(error, "response.data.message", error.message));
        return Promise.reject(error);
      }
    }
  );
};

export const setAuthTokenHeader = ({
  token,
  isAdmin,
  username,
  uoi,
  email,
  fullName,
}) => {
  if (isAdmin) {
    axios.defaults.headers = {
      ...axios.defaults.headers,
      isadmin: isAdmin,
      Authorization: `Basic ${token}`,
      authenticated: true,
    };
  } else if (token) {
    axios.defaults.headers = {
      ...axios.defaults.headers,
      Authorization: `ApiKey ${token}`,
      authenticated: true,
    };
  }
  persistAuthInfo({ token, isAdmin, username, uoi, email, fullName });
};

export const removeAuthTokenHeader = () => {
  removeAuthInfo();
  axios.defaults.headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    authenticated: false,
  };
};

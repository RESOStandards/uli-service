const logger = require("logger");
const axios = require("axios");
const utils = require("utils");
const elasticUtils = require("utils/elastic");
const _ = require("lodash");
const { CustomError } = require("utils/customError");
const accessManagementConstants = require("commonConstants/accessManagement");

const createRole = async (headerOptions) => {
  const body = {
    cluster: [],
    indices: accessManagementConstants.resoRolePrivileges,
    applications: [],
  };
  const response = await axios({
    method: "POST",
    baseURL: elasticUtils.baseUrl,
    url: `/_security/role/reso_user`,
    data: body,
    headers: headerOptions,
  });
  return response;
};

const createRoleIfNotExist = async (headerOptions) => {
  try {
    const response = await axios({
      method: "GET",
      baseURL: elasticUtils.baseUrl,
      url: `_security/role/reso_user`,
      headers: headerOptions,
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      if (_.isEmpty(error.response.data)) {
        //create a role if the response data returned by the error object is empty, else it can be any other error
        await createRole(headerOptions);
      } else {
        throw new CustomError(
          "Error while creating role => " + JSON.stringify(error.response.data),
          error.response.status
        );
      }
    } else {
      throw new CustomError("Error while creating role => ", error);
    }
  }
};

const findUser = async (username, headerOptions) => {
  try {
    const response = await axios({
      method: "GET",
      baseURL: elasticUtils.baseUrl,
      url: `_security/user/${username}`,
      headers: headerOptions,
    });
    return response.data[username];
  } catch (error) {
    return null;
  }
};

const createOrUpdateUser = async (
  { username, userInfo, update = false, isAdmin },
  headerOptions
) => {
  try {
    let body = {};
    const roles = [isAdmin ? "superuser" : "reso_user"];
    if (update) {
      body = {
        full_name: userInfo.full_name,
        email: userInfo.email,
        roles,
        metadata: {
          ...userInfo.metadata,
        },
      };
    } else {
      body = {
        password: userInfo.password,
        roles,
        full_name: userInfo.full_name,
        email: userInfo.email,
        metadata: {
          ...userInfo.metadata,
        },
      };
    }
    if (!isAdmin) {
      await createRoleIfNotExist(headerOptions);
    }
    const response = await axios({
      method: "POST",
      baseURL: elasticUtils.baseUrl,
      url: `/_security/user/${username}`,
      data: body,
      headers: headerOptions,
    });
    return { isUserCreated: response.data.created };
  } catch (error) {
    logger.error(
      `Error while creating user in Elastic Service for username => ${username}  ${JSON.stringify(
        utils.getErrorMessageFromElastic(error) || error
      )}`
    );
    return Promise.reject(utils.getErrorMessageFromElastic(error) || error);
  }
};

const listUsers = async (headerOptions) => {
  try {
    const response = await axios({
      method: "GET",
      baseURL: elasticUtils.baseUrl,
      url: "_security/user",
      headers: headerOptions,
    });
    const resoUsers = Object.values(response.data).reduce(
      (result, user) => {
        if (user.roles.includes("reso_user")) {
          result["reso_user"].push(user);
        } else if (user.roles.includes("superuser")) {
          result["superuser"].push(user);
        }
        return result;
      },
      { reso_user: [], superuser: [] }
    );
    return resoUsers;
  } catch (error) {
    logger.error(
      `Error while fetching list of Users in Elastic Service`,
      error
    );
    return Promise.reject(error);
  }
};

const deleteUser = async (username, headerOptions) => {
  try {
    const response = await axios({
      method: "DELETE",
      baseURL: elasticUtils.baseUrl,
      url: `_security/user/${username} `,
      headers: headerOptions,
    });
    return response.data;
  } catch (error) {
    logger.error(`Error while deleting User in Elastic Service`, error);
    return Promise.reject(error);
  }
};

module.exports = {
  createOrUpdateUser,
  listUsers,
  findUser,
  deleteUser,
  createRoleIfNotExist,
};

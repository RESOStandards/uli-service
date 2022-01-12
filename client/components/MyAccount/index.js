import React, { useContext, useState } from "react";
import copy from "copy-to-clipboard";
import btoa from "btoa";
import { useHistory } from "react-router-dom";

import { Button, Input, Toastr } from "components/common";

import { createToken, deleteToken } from "apis/tokenManagement";
import { login } from "apis/authentication";

import { OrganizationContext } from "contexts/organization";
import { UserContext } from "contexts/user";
import { AuthenticationContext } from "contexts/authentication";

const PasswordWall = ({
  password,
  setPassword,
  authenticateAndGetUserInfo,
}) => {
  const history = useHistory();

  return (
    <div className="fixed bg-gray-400 bg-opacity-50 w-screen h-screen left-0 top-0 flex items-center justify-center z-50">
      <div className="w-2/4 overflow-hidden rounded-xl">
        <div className="bg-white min-w-1xl flex flex-col shadow-lg">
          <div className="px-12 py-5 flex justify-between">
            <p>Please enter your password to proceed...</p>
            <div
              className="cursor-pointer flex justify-end"
              data-test-id="create-user-form-close-button"
              onClick={() => history.replace("/")}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="24"
                height="24"
              >
                <path fill="none" d="M0 0h24v24H0z" />
                <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-11.414L9.172 7.757 7.757 9.172 10.586 12l-2.829 2.828 1.415 1.415L12 13.414l2.828 2.829 1.415-1.415L13.414 12l2.829-2.828-1.415-1.415L12 10.586z" />
              </svg>
            </div>
          </div>
          <form onSubmit={authenticateAndGetUserInfo}>
            <div className="bg-gray-200 w-full flex flex-col items-center">
              <div className="w-full flex flex-col mt-4 justify-center items-center">
                <div className="w-56">
                  <Input
                    placeholder="password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    label="Proceed"
                    type="submit"
                    className="py-3 my-8 text-lg from-green-500 rounded-xl text-white "
                  ></Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const MyAccount = () => {
  const [organizations] = useContext(OrganizationContext);
  const [userData, setUserData] = useContext(UserContext);
  const [authenticated] = useContext(AuthenticationContext);

  const [showPasswordWall, setShowPasswordWall] = useState(true);
  const [password, setPassword] = useState("");

  const createTokenForUser = async (username = userData.username) => {
    const response = await createToken(username);
    setUserData({
      ...userData,
      apiKeys: response.data.metadata.apiKeys,
    });
    Toastr.info(`Token created successfully`);
  };

  const deleteTokenHandler = async (tokenId) => {
    await deleteToken(userData.username, tokenId);
    setUserData({
      ...userData,
      apiKeys: userData.apiKeys.filter((apiKey) => apiKey.id !== tokenId),
    });
    Toastr.info(`Token deleted successfully`);
  };

  const authenticateAndGetUserInfo = async (e) => {
    e.preventDefault();
    const response = await login({ username: userData?.username, password });
    setUserData(response.data);
    setShowPasswordWall(false);
  };

  if (!authenticated) {
    return <h2>Sorry, you have no access this page.</h2>;
  }

  if (userData && !userData.apiKeys && showPasswordWall) {
    return (
      <PasswordWall
        setUserData={setUserData}
        password={password}
        setPassword={setPassword}
        authenticateAndGetUserInfo={authenticateAndGetUserInfo}
      />
    );
  }

  return (
    <div className="h-full flex justify-center items-center w-full max-w-7xl mb-8">
      <div className="rounded-lg border border-gray-300 bg-white px-6 py-5 w-7/12">
        <div className="flex items-center mb-4 border-b border-gray-300">
          <h4
            className="text-2xl font-semibold text-left flex-1"
            data-test-id="user-details-title"
          >
            User Details
          </h4>
        </div>
        {userData && (
          <div
            className="flex justify-between items-center text-lg font-medium text-left mb-6"
            data-test-id="user-user-name-label"
          >
            <span>
              Username :{" "}
              <b data-test-id="user-user-name">{userData?.username}</b>
            </span>
          </div>
        )}
        <p
          className="text-lg font-medium text-left mb-6"
          data-test-id="user-full-name-label"
        >
          Full Name : <b data-test-id="user-full-name">{userData?.fullName}</b>
        </p>
        <p
          className="text-lg font-medium text-left mb-6"
          data-test-id="user-email-label"
        >
          Email : <b data-test-id="user-email">{userData?.email}</b>
        </p>
        {userData?.uoi && (
          <>
            <p
              className="text-lg font-medium text-left mb-6"
              data-test-id="user-company-name-label"
            >
              CompanyName :{" "}
              <b data-test-id="user-company-name">
                {organizations.find((org) => org.id === userData?.uoi).name}
              </b>
            </p>
            <p
              className="text-lg font-medium text-left mb-6"
              data-test-id="user-uoi-label"
            >
              UOI : <b>{userData?.uoi}</b>
            </p>
          </>
        )}
        <div className="w-full">
          <h5
            className="text-xl font-semibold text-left border-b border-gray-300 w-full"
            data-test-id="users-tokens-heading"
          >
            Tokens
          </h5>
          <div>
            <div className="flex divide-solid divide-grey-300 divide-x gap-2">
              <div className="flex-1 max-h-48 overflow-y-scroll mt-2 pr-2 h-48">
                {userData?.apiKeys?.length ? (
                  userData?.apiKeys?.map((apiKey, index) => {
                    return (
                      <div
                        key={index}
                        className="border rounded-lg p-2 mt-2 flex items-center gap-2"
                      >
                        <span className="flex-1">{apiKey.name}</span>
                        <Button
                          style="transparent"
                          className="p-0"
                          onClick={() => {
                            copy(btoa(`${apiKey.id}:${apiKey.api_key}`));
                            Toastr.success("Token Hash copied to clipboard");
                          }}
                          icon={
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              width="24"
                              height="24"
                            >
                              <path fill="none" d="M0 0h24v24H0z" />
                              <path d="M7 6V3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3v3c0 .552-.45 1-1.007 1H4.007A1.001 1.001 0 0 1 3 21l.003-14c0-.552.45-1 1.006-1H7zM5.002 8L5 20h10V8H5.002zM9 6h8v10h2V4H9v2zm-2 5h6v2H7v-2zm0 4h6v2H7v-2z" />
                            </svg>
                          }
                        ></Button>
                        {userData.apiKeys.length > 1 && (
                          <Button
                            style="transparent"
                            className="p-0"
                            onClick={() => deleteTokenHandler(apiKey.id)}
                            icon={
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                width="24"
                                height="24"
                              >
                                <path fill="none" d="M0 0h24v24H0z" />
                                <path d="M17 6h5v2h-2v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8H2V6h5V3a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v3zm-8 5v6h2v-6H9zm4 0v6h2v-6h-2zM9 4v2h6V4H9z" />
                              </svg>
                            }
                          ></Button>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div>
                    <p
                      className="mt-4 text-gray-500 font-semibold"
                      data-test-id="create-token-message"
                    >
                      Please create a token for the user to login!
                    </p>
                  </div>
                )}
              </div>
              <div className="flex flex-1 mt-2 justify-center items-center">
                <Button
                  onClick={() => createTokenForUser()}
                  label="Create Token"
                ></Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyAccount;

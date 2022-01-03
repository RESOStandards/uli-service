import React, { useState, useEffect } from "react";
import copy from "copy-to-clipboard";
import btoa from "btoa";

import { Button, Input, Toastr } from "components/common";
import { listUsers } from "apis/user";
import {
  createAdminToken,
  listAdminApiKeys,
  deleteAdminToken,
} from "apis/tokenManagement";
import UserCreateModal from "./UserCreateModal";

const CreateTokenModal = ({
  adminTokenInfo,
  setAdminTokenInfo,
  adminPassword,
  setAdminPassword,
  generateTokenHandler,
  setShowAdminTokenModal,
}) => (
  <div className="fixed bg-gray-400 bg-opacity-50 w-screen h-screen left-0 top-0 flex items-center justify-center z-50">
    <div className="w-2/4 overflow-hidden rounded-xl">
      <div className="bg-white min-w-1xl flex flex-col shadow-lg">
        <div className="px-12 py-5">
          <h2
            className="text-gray-800 text-3xl font-semibold"
            data-test-id="create-token-form-token-heading"
          >
            Token
          </h2>
          <p data-test-id="token-cannot-be-reproduced-warning">
            Please save this token, this cannot be reproduced
          </p>
        </div>
        <div className="bg-gray-200 w-full flex flex-col items-center">
          <div className="w-full flex flex-col mt-4 justify-center items-center">
            <div className="w-56">
              <Input
                placeholder="password"
                name="admin_password"
                type="password"
                value={adminPassword}
                dataTestId="enter-token-password"
                onChange={(e) => setAdminPassword(e.target.value)}
              />
            </div>
            <Button
              label="Generate Token"
              dataTestId="generate-token-button"
              onClick={generateTokenHandler}
              className="py-3 my-8 text-lg from-green-500 rounded-xl text-white "
            ></Button>
            <div>{adminTokenInfo?.hash}</div>
            <div className="flex gap-2">
              {adminTokenInfo?.hash && (
                <Button
                  label="Copy"
                  onClick={() => {
                    copy(adminTokenInfo.hash);
                    Toastr.success("Token Hash copied to clipboard");
                  }}
                  className="py-3 my-8 text-lg from-green-500 rounded-xl text-white "
                ></Button>
              )}
              <Button
                label="Close"
                dataTestId="create-token-form-close-button"
                onClick={() => {
                  setAdminTokenInfo(null);
                  setShowAdminTokenModal(false);
                  setAdminPassword("");
                }}
                className="py-3 my-8 text-lg from-green-500 rounded-xl text-white "
              ></Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const AdminManagement = ({
  users,
  setUsers,
  updateUserList,
  deleteUserHandler,
  currentLoggedInUserName,
}) => {
  const [adminTokens, setAdminTokens] = useState([]);
  const [showAdminTokenModal, setShowAdminTokenModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminTokenInfo, setAdminTokenInfo] = useState(null);
  const [activeAdminUser, setActiveAdminUser] = useState({});
  const [showUserCreateModal, setShowUserCreateModal] = useState(false);

  const adminUserListHandler = (index) => {
    setActiveAdminUser(users.superuser[index]);
  };

  useEffect(() => {
    if (users && users.superuser[0]) {
      setActiveAdminUser(
        activeAdminUser?.username
          ? users?.superuser.find(
              (user) => user.username === activeAdminUser?.username
            ) || users?.superuser[0]
          : users?.superuser[0]
      );
      fetchAdminTokens(users.superuser[0]?.username);
    }
  }, [users]);

  const fetchAdminTokens = async (username) => {
    listAdminApiKeys(username).then((response) => {
      setAdminTokens(response.data);
    });
  };

  const generateTokenHandler = async () => {
    const response = await createAdminToken(
      activeAdminUser.username,
      adminPassword
    );
    const adminInfo = {
      ...response.data.tokenData,
      hash: btoa(
        `${response.data.tokenData.id}:${response.data.tokenData.api_key}`
      ),
    };
    setAdminTokenInfo(adminInfo);
    updateAdminUserList(activeAdminUser);
    await fetchAdminTokens();
  };

  const deleteAdminTokenHandler = async (tokenId) => {
    await deleteAdminToken(activeAdminUser.username, tokenId);
    await fetchAdminTokens();
    Toastr.info(
      `Token for user ${activeAdminUser.username} deleted successfully`
    );
  };

  const updateAdminUserList = (username) => {
    listUsers().then((response) => {
      setUsers(response.data);
      setActiveAdminUser(
        response.data.superuser.find((user) => user.username === username) ||
          response.data.superuser[0]
      );
    });
  };

  return (
    <>
      {showUserCreateModal && (
        <UserCreateModal
          setShowUserCreateModal={setShowUserCreateModal}
          updateUserList={updateUserList}
          isAdmin={true}
          setActiveUser={setActiveAdminUser}
        />
      )}
      <div className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 ">
        {showAdminTokenModal && (
          <CreateTokenModal
            adminTokenInfo={adminTokenInfo}
            setAdminTokenInfo={setAdminTokenInfo}
            adminPassword={adminPassword}
            setAdminPassword={setAdminPassword}
            generateTokenHandler={generateTokenHandler}
            setShowAdminTokenModal={setShowAdminTokenModal}
          />
        )}
        <div className="flex flex-row justify-start items-center">
          <h3
            className="text-2xl font-semibold text-left mr-12"
            data-test-id="admins-heading"
          >
            Admins
          </h3>
          <Button
            label="Create User"
            dataTestId="create-user-button"
            onClick={() => setShowUserCreateModal(true)}
          />
        </div>
        <div className="flex flex-row justify-between items-stretch mt-4">
          <div className="rounded-lg border border-gray-300 bg-white px-6 py-5 w-2/5 overflow-auto">
            <div className="flex flex-col w-full">
              {users?.superuser?.map((user, index) => (
                <div
                  key={index}
                  className="cursor-pointer w-full border-gray-100 border-b"
                  onClick={() => adminUserListHandler(index)}
                >
                  <div className="flex w-full items-center p-2 pl-2 border-transparent border-l-2 relative">
                    <div className="w-full items-center flex">
                      <div
                        className="mx-2 -mt-1 w-1/2 "
                        data-test-id="management-token-page-admin-user-name"
                      >
                        {user.username}
                        <div className="text-xs truncate w-full normal-case font-normal -mt-0 text-gray-500">
                          {user.email}
                        </div>
                      </div>
                      <div className="w-1/2 flex justify-between items-center">
                        <div className="flex justify-center items-center m-1 font-medium py-1 px-2 rounded-full text-teal-700 bg-teal-100 border border-teal-300 ">
                          <div className="text-xs font-normal leading-none max-w-full flex-initial">
                            {user.metadata._reserved ? "reserved" : "custom"}
                          </div>
                        </div>
                        <svg
                          className={
                            activeAdminUser?.username === user.username
                              ? ""
                              : "opacity-0"
                          }
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          width="24"
                          height="24"
                        >
                          <path fill="none" d="M0 0h24v24H0z" />
                          <path d="M13.172 12l-4.95-4.95 1.414-1.414L16 12l-6.364 6.364-1.414-1.414z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {activeAdminUser && (
            <>
              <div className="rounded-lg border border-gray-300 bg-white px-6 py-5 w-7/12">
                <div className="flex items-center mb-4 border-b border-gray-300">
                  <h4
                    className="text-2xl font-semibold text-left flex-1"
                    data-test-id="admin-details-heading"
                  >
                    Admin Details
                  </h4>
                  {!activeAdminUser?.metadata?._reserved &&
                    currentLoggedInUserName !== activeAdminUser.username && (
                      <Button
                        style="transparent"
                        dataTestId="admin-user-delete-button"
                        onClick={() =>
                          deleteUserHandler(activeAdminUser.username)
                        }
                        icon={
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            width="24"
                            height="24"
                          >
                            <path fill="none" d="M0 0h24v24H0z" />
                            <path d="M17 6h5v2h-2v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8H2V6h5V3a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v3zm1 2H6v12h12V8zm-9 3h2v6H9v-6zm4 0h2v6h-2v-6zM9 4v2h6V4H9z" />
                          </svg>
                        }
                      />
                    )}
                </div>
                {activeAdminUser && (
                  <div
                    className="flex justify-between items-center text-lg font-medium text-left mb-6"
                    data-test-id="admin-user-name-label"
                  >
                    <span>
                      Username :{" "}
                      <b data-test-id="admin-user-name">
                        {activeAdminUser?.username}
                      </b>
                    </span>
                    <div className="flex justify-center items-center m-1 font-medium py-1 px-2 rounded-full text-gray-700 bg-gray-100 shadow-inner border border-gray-300 ">
                      <div className="text-xs font-normal">
                        {activeAdminUser?.metadata?._reserved
                          ? "reserved"
                          : "custom"}
                      </div>
                    </div>
                  </div>
                )}
                {activeAdminUser?.full_name && (
                  <p
                    className="text-lg font-medium text-left mb-6"
                    data-test-id="admin-full-name-label"
                  >
                    Full Name :{" "}
                    <b data-test-id="admin-full-name">
                      {activeAdminUser.full_name}
                    </b>
                  </p>
                )}
                {activeAdminUser?.email && (
                  <p
                    className="text-lg font-medium text-left mb-6"
                    data-test-id="admin-email-label"
                  >
                    Email :{" "}
                    <b data-test-id="admin-email">{activeAdminUser.email}</b>
                  </p>
                )}
                <div className="w-full">
                  <h5
                    className="text-xl font-semibold text-left border-b border-gray-300 w-full"
                    data-test-id="tokens-heading"
                  >
                    Tokens
                  </h5>
                  <div>
                    <div className="flex divide-solid divide-grey-300 divide-x gap-2">
                      <div className="flex-1 max-h-48 overflow-y-scroll mt-2 pr-2 h-48">
                        {adminTokens?.map((apiKey, index) => {
                          return (
                            <div
                              key={index}
                              className="border rounded-lg p-2 mt-2 flex items-center gap-2"
                            >
                              <span className="flex-1">{apiKey.name}</span>
                              <Button
                                style="transparent"
                                className="p-0"
                                dataTestId="tokens-delete-icon"
                                onClick={() =>
                                  deleteAdminTokenHandler(apiKey.id)
                                }
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
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex flex-1 mt-2 justify-center items-center">
                        <Button
                          onClick={() => setShowAdminTokenModal(true)}
                          label="Create Token"
                          dataTestId="create-token-button"
                        ></Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default AdminManagement;

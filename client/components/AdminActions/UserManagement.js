import React, { useState, useEffect, useContext } from "react";
import copy from "copy-to-clipboard";
import btoa from "btoa";

import { OrganizationContext } from "contexts/organization";

import { Button, Toastr } from "components/common";
import { createToken, deleteToken } from "apis/tokenManagement";
import UserCreateModal from "./UserCreateModal";

const UserManagement = ({ users, updateUserList, deleteUserHandler }) => {
  const [organizations] = useContext(OrganizationContext);

  const [activeUser, setActiveUser] = useState({});

  const [showUserCreateModal, setShowUserCreateModal] = useState(false);

  useEffect(() => {
    setActiveUser(
      activeUser?.username
        ? users?.reso_user.find(
            (user) => user.username === activeUser?.username
          ) || users?.reso_user[0]
        : users?.reso_user[0]
    );
  }, [users]);

  const userListHandler = (index) => {
    setActiveUser(users?.reso_user[index]);
  };

  const createTokenForUser = async (username = activeUser.username) => {
    await createToken(username);
    await updateUserList();
  };

  const deleteTokenHandler = async (tokenId) => {
    await deleteToken(activeUser.username, tokenId);
    updateUserList();
    Toastr.info(`Token for user ${activeUser.username} deleted successfully`);
  };

  return (
    <>
      {showUserCreateModal && (
        <UserCreateModal
          setShowUserCreateModal={setShowUserCreateModal}
          createTokenForUser={createTokenForUser}
          updateUserList={updateUserList}
          isAdmin={false}
          setActiveUser={setActiveUser}
          organizations={organizations.map((org) => ({
            label: org.name,
            value: org.id,
          }))}
        />
      )}
      <div className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-gray-400 mb-8">
        <div className="flex flex-row justify-start items-center">
          <h3
            className="text-2xl font-semibold text-left mr-12"
            data-test-id="users-heading"
          >
            Users
          </h3>
          <Button
            label="Create User"
            dataTestId="create-user-button"
            onClick={() => setShowUserCreateModal(true)}
          />
        </div>
        {!!users?.reso_user?.length && (
          <div className="flex flex-row justify-between items-stretch mt-4">
            <div className="rounded-lg border border-gray-300 bg-white px-6 py-5 w-2/5 overflow-auto">
              <div className="flex flex-col w-full">
                {users.reso_user?.map((user, index) => (
                  <div
                    key={index}
                    className="cursor-pointer w-full border-gray-100 border-b"
                    onClick={() => userListHandler(index)}
                  >
                    <div className="flex w-full items-center p-2 pl-2 border-transparent border-l-2 relative">
                      <div className="w-full items-center flex">
                        <div
                          className="mx-2 -mt-1 w-1/2"
                          data-test-id="user-management-user-name"
                        >
                          {user.username}
                          <div className="text-xs truncate w-full normal-case font-normal -mt-0 text-gray-500">
                            {user.email}
                          </div>
                        </div>
                        <div className="w-1/2 flex justify-end items-center">
                          <svg
                            className={
                              activeUser?.username === user.username
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
            {activeUser && (
              <>
                <div className="rounded-lg border border-gray-300 bg-white px-6 py-5 w-7/12">
                  <div className="flex items-center mb-4 border-b border-gray-300">
                    <h4
                      className="text-2xl font-semibold text-left flex-1"
                      data-test-id="user-details-title"
                    >
                      User Details
                    </h4>
                    <Button
                      style="transparent"
                      onClick={() => deleteUserHandler(activeUser.username)}
                      dataTestId="user-delete-button"
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
                    ></Button>
                  </div>
                  {activeUser && (
                    <div
                      className="flex justify-between items-center text-lg font-medium text-left mb-6"
                      data-test-id="user-user-name-label"
                    >
                      <span>
                        Username :{" "}
                        <b data-test-id="user-user-name">
                          {activeUser?.username}
                        </b>
                      </span>
                    </div>
                  )}
                  <p
                    className="text-lg font-medium text-left mb-6"
                    data-test-id="user-full-name-label"
                  >
                    Full Name :{" "}
                    <b data-test-id="user-full-name">{activeUser?.full_name}</b>
                  </p>
                  <p
                    className="text-lg font-medium text-left mb-6"
                    data-test-id="user-email-label"
                  >
                    Email : <b data-test-id="user-email">{activeUser?.email}</b>
                  </p>
                  {activeUser?.metadata?.uoi && (
                    <>
                      <p
                        className="text-lg font-medium text-left mb-6"
                        data-test-id="user-company-name-label"
                      >
                        CompanyName :{" "}
                        <b data-test-id="user-company-name">
                          {
                            organizations.find(
                              (org) => org.id === activeUser?.metadata?.uoi
                            )?.name
                          }
                        </b>
                      </p>
                      <p
                        className="text-lg font-medium text-left mb-6"
                        data-test-id="user-uoi-label"
                      >
                        UOI : <b>{activeUser?.metadata?.uoi}</b>
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
                          {activeUser?.metadata?.apiKeys?.length ? (
                            activeUser?.metadata?.apiKeys?.map(
                              (apiKey, index) => {
                                return (
                                  <div
                                    key={index}
                                    className="border rounded-lg p-2 mt-2 flex items-center gap-2"
                                  >
                                    <span className="flex-1">
                                      {apiKey.name}
                                    </span>
                                    <Button
                                      style="transparent"
                                      className="p-0"
                                      dataTestId="token-copy-button"
                                      onClick={() => {
                                        copy(
                                          btoa(`${apiKey.id}:${apiKey.api_key}`)
                                        );
                                        Toastr.success(
                                          "Token Hash copied to clipboard"
                                        );
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
                                    <Button
                                      style="transparent"
                                      className="p-0"
                                      dataTestId="users-token-delete-button"
                                      onClick={() =>
                                        deleteTokenHandler(apiKey.id)
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
                              }
                            )
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
                            dataTestId="users-create-token-button"
                          ></Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default UserManagement;

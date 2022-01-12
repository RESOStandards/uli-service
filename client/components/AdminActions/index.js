import React, { useEffect, useState, useLayoutEffect, useContext } from "react";

import { Toastr } from "components/common";
import { getAuthInfo } from "helpers/auth";
import OrgManagement from "./OrgManagement";
import UserManagement from "./UserManagement";
import AdminManagement from "./AdminManagement";
import { listUsers, deleteUser } from "apis/user";

import { UserContext } from "contexts/user";

const AdminActions = () => {
  const [userData] = useContext(UserContext);

  const [users, setUsers] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useLayoutEffect(() => {
    setIsAdmin(eval(getAuthInfo().isAdmin));
  }, []);

  useEffect(() => {
    updateUserList();
  }, []);

  const updateUserList = () => {
    listUsers().then((response) => {
      setUsers(response.data);
    });
  };

  const deleteUserHandler = async (username) => {
    await deleteUser(username);
    Toastr.info(`user ${username} deleted successfully.`);
    updateUserList();
  };

  if (!isAdmin) {
    return <h2>Sorry, you have no access this page.</h2>;
  }

  return (
    <div className="w-full h-full max-w-7xl overflow-y-scroll">
      <OrgManagement />
      <UserManagement
        users={users}
        updateUserList={updateUserList}
        deleteUserHandler={deleteUserHandler}
      />
      <AdminManagement
        users={users}
        setUsers={setUsers}
        updateUserList={updateUserList}
        deleteUserHandler={deleteUserHandler}
        currentLoggedInUserName={userData?.username}
      />
    </div>
  );
};

export default AdminActions;

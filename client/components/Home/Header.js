import React, { useContext } from "react";
import { Button, Link } from "components/common";
import { useHistory, useLocation } from "react-router-dom";
import { Tooltip2 } from "@blueprintjs/popover2";
import { logout } from "apis/authentication";

import { AuthenticationContext } from "contexts/authentication";
import { OrganizationContext } from "contexts/organization";
import { UserContext } from "contexts/user";

const Header = () => {
  const history = useHistory();
  const location = useLocation();

  const [authenticated] = useContext(AuthenticationContext);
  const [organizations] = useContext(OrganizationContext);
  const [userData, setUserData] = useContext(UserContext);

  const { isAdmin, fullName, uoi } = userData;

  const goHome = (e) => {
    e.preventDefault();
    if (location.pathname === "/") {
      window.location.reload();
    } else {
      history.push("/");
    }
  };

  const handleLogout = async () => {
    await logout();
    setUserData({});
    if (location.pathname === "/") {
      window.location.reload();
    } else {
      history.push("/");
    }
  };

  const orgName = organizations.find((org) => org.id === userData.uoi)?.name;

  return (
    <header className="border-b md:flex p-4 pb-0 shadow-md md:pb-4 fixed z-10 w-full bg-white top-0">
      <div className="flex-1 flex">
        <div
          onClick={goHome}
          className="h-full w-40 bg-reso-logo-horizontal bg-contain bg-no-repeat bg-left cursor-pointer"
          data-test-id="reso-logo"
        ></div>
        <div className="flex flex-col-reverse mr-2 relative">
          <Tooltip2
            className="z-20"
            content="The data represented currently on the site may not depict the real data."
            placement="right"
          >
            <span className="rounded-lg text-xs bg-gray-200 border border-gray-300 text-gray-500 px-1 cursor-pointer">
              BETA
            </span>
          </Tooltip2>
        </div>
        {orgName && (
          <div className="rounded border border-resorush flex gap-2 justify-center items-center px-1 text-gray-500 font-bold">
            {orgName}
            <span className="rounded-sm bg-gray-300 p-1">{userData?.uoi}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-4">
        {location.pathname !== "/" && (
          <Link
            onClick={goHome}
            label="Endorsements"
            className="text-black-400 hover:text-grey-600"
            dataTestId="all-reports-link"
          />
        )}
        {isAdmin && (
          <Link
            to="/token"
            label="Admin Actions"
            className="text-black-400 hover:text-grey-600 no-underline"
            dataTestId="admin-actions-link"
          />
        )}
        {authenticated && !isAdmin && (
          <Link
            to="/my_account"
            label="My Account"
            className="text-black-400 hover:text-grey-600 no-underline"
            dataTestId="my-account-link"
          />
        )}
        <span className="font-semibold text-gray-500">
          {" "}
          {fullName && `Hi, ${fullName}`}
        </span>
        {authenticated ? (
          <Button
            label="Logout"
            dataTestId="logout-button"
            onClick={handleLogout}
          />
        ) : (
          <Button label="Login" onClick={() => history.replace("/login")} />
        )}
      </div>
    </header>
  );
};

export default Header;

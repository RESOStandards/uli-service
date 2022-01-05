import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useRef,
} from "react";
import { getAuthInfo } from "helpers/auth";
import { setAuthTokenHeader, removeAuthTokenHeader } from "apis";

import { AuthenticationContext } from "contexts/authentication";

export const UserContext = createContext();

export const UserProvider = (props) => {
  const didMountRef = useRef(false);

  const [_, setAuthenticated] = useContext(AuthenticationContext);

  const [userData, setUserData] = useState({});

  useEffect(async () => {
    const { isAdmin, ...rest } = getAuthInfo();
    const userInfoFromLocalStorage = { isAdmin: eval(isAdmin), ...rest };
    setAuthTokenHeader(userInfoFromLocalStorage);
    setUserData(userInfoFromLocalStorage);
  }, []);

  useEffect(async () => {
    if (didMountRef.current) {
      if (userData.token || userData.isAdmin) {
        const { apiKeys, ...restUserData } = userData;
        setAuthTokenHeader(restUserData);
        setAuthenticated(true);
      } else {
        removeAuthTokenHeader();
        setAuthenticated(false);
      }
    } else didMountRef.current = true;
  }, [userData]);

  return (
    <UserContext.Provider value={[userData, setUserData]}>
      {props.children}
    </UserContext.Provider>
  );
};

import React, { createContext, useState, useEffect } from "react";
import { setAxiosIntercepts } from "apis";

export const AuthenticationContext = createContext();

export const AuthenticationProvider = (props) => {
  const [authenticated, setAuthenticated] = useState(null);

  useEffect(() => {
    setAxiosIntercepts(setAuthenticated);
  }, []);

  return (
    <AuthenticationContext.Provider value={[authenticated, setAuthenticated]}>
      {props.children}
    </AuthenticationContext.Provider>
  );
};

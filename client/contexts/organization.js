import React, { createContext, useState, useEffect } from "react";

import { fetchAllOrganizations } from "apis/organization";
export const OrganizationContext = createContext();

export const OrganizationProvider = (props) => {
  const [organizations, setOrganizations] = useState([]);

  useEffect(async () => {
    setOrganizations((await fetchAllOrganizations()).data);
  }, []);

  return (
    <OrganizationContext.Provider value={[organizations, setOrganizations]}>
      {props.children}
    </OrganizationContext.Provider>
  );
};

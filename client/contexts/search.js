import React, { createContext, useState } from "react";

export const SearchContext = createContext();

export const SearchProvider = (props) => {
  const [searchKey, setSearchKey] = useState("");

  return (
    <SearchContext.Provider value={[searchKey, setSearchKey]}>
      {props.children}
    </SearchContext.Provider>
  );
};

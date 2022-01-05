import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import { FocusStyleManager } from "@blueprintjs/core";

import Home from "components/Home";
import Login from "components/Authentication/Login";

import { AuthenticationProvider } from "contexts/authentication";
import { OrganizationProvider } from "contexts/organization";
import { UserProvider } from "contexts/user";
import { SearchProvider } from "contexts/search";

import "./styles/index.scss";

FocusStyleManager.onlyShowFocusOnTabs();

const errorFallback = () => {
  return (
    <div className="h-screen flex justify-center items-center text-xl">
      <div className="flex items-center gap-10 m-48 h-96 w-1/2 p-16 rounded-lg bg-gray-300">
        <div className="w-48 h-full bg-reso-logo-vertical-blue bg-contain bg-no-repeat bg-left"></div>
        <p className="text-3xl font-bold">
          Something went wrong. Please try later.
        </p>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary FallbackComponent={errorFallback}>
      <AuthenticationProvider>
        <UserProvider>
          <OrganizationProvider>
            <Router>
              <SearchProvider>
                <Switch>
                  <Route
                    path="/login"
                    render={(props) => <Login {...props} />}
                  />
                  <Route path="/">
                    <Home />
                  </Route>
                </Switch>
              </SearchProvider>
            </Router>
          </OrganizationProvider>
        </UserProvider>
      </AuthenticationProvider>
    </ErrorBoundary>
  );
}

ReactDOM.render(<App />, document.getElementById("root"));

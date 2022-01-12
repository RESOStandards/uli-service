import React, { useState, useEffect } from "react";
import { Route, Switch } from "react-router-dom";
import BarLoader from "react-spinners/BarLoader";

import { initializeLogger } from "helpers/logger";

import Header from "./Header";
import Footer from "./Footer";
import AdminActions from "components/AdminActions";
import MyAccount from "components/MyAccount";
import { Error404 } from "components/common";

const Home = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeLogger();
    setLoading(false);
  }, []);

  if (loading) {
    return <BarLoader style={{ width: "100%" }} />;
  }

  return (
    <>
      <Header />
      <div className="flex flex-col justify-center items-center w-full px-8 pt-24 pb-16 h-screen">
        <Switch>
          <Route path="/token">
            <AdminActions />
          </Route>
          <Route path="/my_account">
            <MyAccount />
          </Route>
          <Route exact path="/">
          </Route>
          <Route>
            <Error404 />
          </Route>
        </Switch>
      </div>
      <Footer />
    </>
  );
};

export default Home;

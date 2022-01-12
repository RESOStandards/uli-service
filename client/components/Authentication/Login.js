import React, { useEffect, useState, useContext } from "react";
import { Button, Input, Spacer, Toastr } from "components/common";
import { login } from "apis/authentication";

import { AuthenticationContext } from "contexts/authentication";
import { UserContext } from "contexts/user";

const Login = (props) => {
  const [authenticated] = useContext(AuthenticationContext);
  const [_, setUserData] = useContext(UserContext);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authenticated) {
      props.history.push("/");
    }
    return () => {
      setLoading(false);
    };
  }, []);

  const onSubmitHandler = async (e) => {
    try {
      e.preventDefault();
      setLoading(true);
      const response = await login({ username, password });
      setUserData(response.data);
      Toastr.success("Login Successful");
      props.history.push("/");
    } catch (err) {
      logger.error(
        "Error while logging in => ",
        err?.response?.data?.message || err
      );
      setLoading(false);
    }
  };
  return (
    <div className="flex flex-col justify-center min-h-screen py-12 bg-gray-100 sm:px-6 lg:px-8">
      <Spacer size={3} />
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <form onSubmit={onSubmitHandler}>
          <div className="px-4 py-8 bg-white shadow sm:rounded-lg sm:px-10">
            <h2
              className="mt-1 text-2xl leading-9 text-center text-gray-900"
              data-test-id="log-in-to-your-account-title"
            >
              Log in to your account
            </h2>
            <Spacer size={6} />
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              type="text"
              required
              label="Username"
              dataTestId="enter-login-user-name"
            />
            <Spacer size={4} />
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              label="Password"
              dataTestId="enter-login-password"
            />
            <Spacer size={8} />
            <Button
              type="submit"
              loading={loading}
              fullWidth
              label="Log in"
              dataTestId="login-button"
            />
            <Spacer size={8} />
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;

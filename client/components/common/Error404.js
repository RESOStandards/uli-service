import React from "react";

const Error404 = ({ message = "PAGE NOT FOUND" }) => {
  return (
    <div className="flex flex-col justify-around items-center gap-10 m-48 w-2/3 p-16 rounded-lg bg-gray-300">
      <div className="flex">
        <div className="w-48 h-full bg-reso-logo-vertical-blue bg-contain bg-no-repeat bg-left"></div>
        <div className="flex my-4 items-start justify-center flex-col">
          <p className="text-jumbo text-gray-400 font-bold">404</p>
        </div>
      </div>
      <p className="text-3xl w-full text-center text-gray-600 font-bold">
        {message}
      </p>
    </div>
  );
};

export default Error404;

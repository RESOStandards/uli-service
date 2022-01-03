import React, { Component } from "react";
import classnames from "classnames";

export default class Input extends Component {
  errorClasses =
    "text-red-900 placeholder-red-300 focus:border-red-300 focus:ring-red border-red-300";
  render() {
    const {
      label,
      type,
      placeholder,
      error,
      required,
      value,
      onChange,
      name,
      dataTestId,
      className,
      disabled,
      ...restprops
    } = this.props;
    return (
      <div
        className={classnames(
          "h-14 w-full box-border flex flex-col justify-center",
          className
        )}
      >
        <span className="block text-sm font-medium leading-5 text-gray-700">
          {label}
        </span>
        <div className="relative rounded-md shadow-sm w-full">
          <input
            onChange={onChange}
            value={value}
            type={type}
            required={required}
            placeholder={placeholder}
            name={name}
            className={classnames(
              "appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue transition duration-150 ease-in-out sm:text-sm sm:leading-5",
              {
                [this.errorClasses]: !!error,
                "focus:border-blue-300": !error,
              },
              {
                "text-gray-400": disabled,
              }
            )}
            data-test-id={dataTestId}
            disabled={disabled}
            {...restprops}
          />
          {!!error && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-red-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
        </div>
        <p className="text-sm text-red-500 h-4">{error}</p>
      </div>
    );
  }
}

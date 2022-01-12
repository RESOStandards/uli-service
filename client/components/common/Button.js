import React, { Component } from "react";
import classnames from "classnames";
import PulseLoader from "react-spinners/PulseLoader";

const buttonStyles = {
  primary:
    "shadow-sm flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gray-800 focus:outline-none focus:border-gray-700 active:bg-gray-700 transition duration-150 ease-in-out",
  danger:
    "shadow-sm inline-flex justify-center px-2.5 py-1.5 border border-transparent text-sm font-medium rounded text-red-700 bg-red-100 hover:bg-red-50 focus:outline-none focus:border-red-300 focus:ring-red active:bg-red-200 transition ease-in-out duration-150",
  white:
    "shadow-sm inline-flex items-center justify-center py-2 px-4 border border-gray-300 rounded-md bg-white text-sm leading-5 font-medium text-gray-500 hover:text-gray-600 focus:outline-none focus:border-blue-300 focus:ring-blue transition duration-150 ease-in-out",
  transparent:
    "inline-flex justify-center items-center py-2 px-4 rounded-md text-sm leading-5 font-medium focus:outline-none transition duration-150 ease-in-out",
  disabled:
    "shadow-sm flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gray-300 cursor-default",
};
export default class Button extends Component {
  render() {
    const {
      icon,
      label,
      loading,
      onClick,
      type,
      style,
      fullWidth,
      className,
      dataTestId,
      isDisabled,
      iconPosition = "left",
    } = this.props;
    const baseClasses = isDisabled
      ? buttonStyles.disabled
      : buttonStyles[style] || buttonStyles.primary;

    return (
      <button
        onClick={isDisabled ? undefined : onClick}
        type={type || "button"}
        className={classnames(
          baseClasses,
          { [className]: !isDisabled },
          { "w-full": fullWidth }
        )}
        data-test-id={dataTestId}
      >
        {loading ? (
          <Loading />
        ) : (
          <span
            className={classnames(
              "inline-flex gap-2 items-center whitespace-nowrap",
              {
                "flex-row-reverse": iconPosition === "right",
              }
            )}
          >
            {icon} {label}
          </span>
        )}
      </button>
    );
  }
}

const Loading = ({ dark = false }) => {
  return (
    <PulseLoader
      size={6}
      color={dark ? "#364152" : "#ffffff"}
      css="margin-right: 0.75rem; margin-left: 0.75rem;"
    />
  );
};

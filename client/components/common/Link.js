import React, { Component } from "react";
import { Link as RouterLink } from "react-router-dom";
import classNames from "classnames";

export default class Link extends Component {
  render() {
    const {
      label,
      url,
      to,
      className = "",
      onClick,
      newTab,
      children,
      dataTestId,
      customTextColor = false,
      focusUnderline = true,
    } = this.props;
    let Parent, attributes;
    if (to) {
      Parent = RouterLink;
      attributes = { label, to };
    } else {
      Parent = `a`;
      attributes = { label, href: url || "#", onClick };
      if (newTab) {
        attributes.target = "_blank";
      }
    }
    return (
      <Parent
        {...attributes}
        className={classNames("font-medium focus:outline-none transition ease-in-out duration-150",
          { "focus:underline ": focusUnderline },
          { "text-indigo-600 hover:text-indigo-500 ": !customTextColor },
          className
        )
        }
        data-test-id={dataTestId}
      >
        {label || ""}
        {children || ""}
      </Parent>
    );
  }
}

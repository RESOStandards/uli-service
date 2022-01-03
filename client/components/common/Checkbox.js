import React, { Component } from "react";
import { Checkbox } from "@blueprintjs/core";
import classnames from "classnames";

export default class Checkboxs extends Component {
  render() {
    const {
      checked,
      label,
      onChange,
      className,
      dataTestId,
      position = "right",
      isLarge = false,
      ...restprops
    } = this.props;
    return (
      <div className="flex justify-center items-center">
        <Checkbox
          checked={checked}
          label={label}
          data-test-id={dataTestId}
          onChange={onChange}
          alignIndicator={position}
          large={isLarge}
          className={classnames("mb-0 text-gray-700 cursor-pointer", className)}
          {...restprops}
        />
      </div>
    );
  }
}

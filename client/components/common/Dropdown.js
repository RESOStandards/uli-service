import React from "react";

import { Button } from "components/common";
import { Position } from "@blueprintjs/core";
import { Popover2 } from "@blueprintjs/popover2";

const Dropdown = (props) => {
  const {
    filterMenu,
    btnLabel,
    btnStyle,
    btnClassName,
    controlled,
    interactionKind = "click",
    isOpen,
    setIsOpen,
    children,
    isDisabled,
  } = props;

  return (
    <Popover2
      content={filterMenu}
      placement={Position.BOTTOM}
      minimal={true}
      popoverClassName="bg-white border-0"
      isOpen={isOpen}
      disabled={isDisabled}
      interactionKind={interactionKind}
      onInteraction={controlled && ((state) => setIsOpen(state))}
    >
      {children ? (
        children
      ) : (
        <Button
          label={btnLabel}
          className={btnClassName || ""}
          style={btnStyle}
        />
      )}
    </Popover2>
  );
};

export default Dropdown;

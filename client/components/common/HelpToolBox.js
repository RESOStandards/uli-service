import React, { useState } from "react";
import classnames from "classnames";
import { Icon } from "@blueprintjs/core";

const HelpToolBox = (props) => {
  const {
    className,
    title,
    children,
    size = "small",
    positionX = "right",
    positionY = "middle",
  } = props;

  const [showBox, setShowBox] = useState(false);
  const containerHeight = size === "large" ? 112 : 96;
  return (
    <div
      onClick={() => setShowBox(!showBox)}
      className={classnames(
        className,
        "cursor-pointer rounded-full h-8 w-8 flex items-center justify-center bg-gray-100 border border-gray-400 p-2 z-10",
        "hover:bg-gray-200",
        "relative"
      )}
    >
      <p className="text-xl font-bold text-gray-400 select-none">?</p>
      <div
        className={classnames(
          "absolute border max-h-112 border-gray-300 shadow bg-white text-gray-600 rounded transition-all overflow-hidden ",
          {
            "left-11": positionX === "right",
            "right-11": positionX === "left",
            "top-0": positionY === "bottom",
            [`h-${containerHeight} w-80`]: showBox,
            "opacity-0 h-0 w-0": !showBox,
          }
        )}
      >
        {showBox && (
          <div
            className={classnames(
              "h-full flex flex-col p-4 gap-4 justify-between shadow-inner "
            )}
          >
            <span className="text-xl text-gray-500 font-bold flex justify-between items-center">
              <h3 className="">{title}</h3>
              <Icon icon="small-cross" iconSize={16} />
            </span>
            <div className="flex-1 flex flex-col gap-4 ">{children}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HelpToolBox;

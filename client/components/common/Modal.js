import React from "react";
import { Overlay } from "@blueprintjs/core";
import classnames from "classnames";

const Modal = ({ onClose, className, children }) => {
  return (
    <Overlay
      isOpen={true}
      onClose={onClose}
      canOutsideClickClose={true}
      hasBackdrop={false}
      className="flex row justify-center items-center h-screen w-screen"
    >
      <div className="fixed bottom-0 inset-x-0 px-4 pb-6 sm:inset-0 sm:p-0 sm:flex sm:items-center sm:justify-center">
        <div className="fixed inset-0 transition-opacity">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        <div
          className={classnames([
            "animated fadeIn bg-white rounded-lg px-4 pt-5 pb-4 overflow-hidden shadow-xl transform transition-all w-auto sm:p-6",
            className,
          ])}
        >
          {children}
        </div>
      </div>
    </Overlay>
  );
};

export default Modal;

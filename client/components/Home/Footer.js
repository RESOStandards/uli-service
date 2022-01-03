import React from "react";
import { Button, Link } from "components/common";
import { Tooltip2 } from "@blueprintjs/popover2";

const Footer = () => (
  <footer className="border-b flex items-center shadow-md p-2 fixed z-10 w-full bg-white bottom-0">
    <div className="flex-1 flex gap-1 items-center">
      <p className="font-semibold text-xs" data-test-id="summary-page-about">
        About:
      </p>
      <Link
        url="https://www.reso.org/reso-web-api/"
        label="Web API"
        newTab={true}
      />
      |
      <Link
        url="https://www.reso.org/data-dictionary/"
        label="Data Dictionary"
        newTab={true}
      />
      |
      <Link
        url="https://www.reso.org/unique-organization-identifier/"
        newTab={true}
        label="UOI"
        dataTestId="uoi-number-in-home-page"
      />
    </div>
    <div className="flex items-center gap-4">
      <Tooltip2
        className="z-20"
        popoverClassName="noprint"
        content="Print this page"
        placement="top"
      >
        <Button
          style="transparent"
          onClick={window.print}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={24} height={24}><path fill="none" d="M0 0h24v24H0z" /><path d="M6 19H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h3V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v4h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-3v2a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-2zm0-2v-1a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1h2V9H4v8h2zM8 4v3h8V4H8zm0 13v3h8v-3H8zm-3-7h3v2H5v-2z" fill="rgba(149,164,166,1)" /></svg>
          }
        ></Button>
      </Tooltip2>
      <Button
        type="submit"
        fullWidth
        style={"danger"}
        label="Report Data Issue"
        onClick={() => {
          window.location.href = "mailto:certification@reso.org";
        }}
      />
    </div>
  </footer>
);

export default Footer;

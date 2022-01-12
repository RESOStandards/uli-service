import { format } from "fecha";

export const getStatusDate = (
  { status, statusUpdatedAt, generatedOn },
  outputFormat = "MMM D YYYY [at] h:mm a"
) => {
  return format(
    new Date(status === "passed" ? generatedOn : statusUpdatedAt || null),
    outputFormat
  );
};

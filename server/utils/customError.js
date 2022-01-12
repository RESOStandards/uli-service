class CustomError extends Error {
  constructor(message, code) {
    super(message, code);
    this.name = "CustomError";
    this.code = code || 404;
    this.message = message || "Something went wrong";
  }
}

module.exports.CustomError = CustomError;

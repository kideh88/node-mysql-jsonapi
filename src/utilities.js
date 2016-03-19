/**
 * Return proper boolean from json input
 *
 * @param input string
 * @return boolean
 **/
module.exports.stringToBoolean = function (input) {
  switch(input.toLowerCase().trim()){
    case "true":
    case "yes":
    case "1":
      return true;
    case "false":
    case "no":
    case "0":
    case null:
      return false;
    default:
      return Boolean(input);
  }
};

class DataHookError extends Error {
  /**
   * Construct a more detailed error.
   *
   * @param fileName string
   * @param functionName string
   * @param message string
   * @param statusCode integer
   * @return void
   **/
  constructor (fileName, functionName, message, statusCode) {
    super(message);
    this.fileName = fileName;
    this.functionName = functionName;
    this.statusCode = statusCode;
  }
}

module.exports.DataHookError = DataHookError;



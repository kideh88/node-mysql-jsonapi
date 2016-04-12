/**
 * Return boolean from json input possibilities
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


module.exports.isInt = function (input) {
  if (isNaN(input)) {
    return false;
  }
  let value = parseFloat(input);
  return (value | 0) === value;
};
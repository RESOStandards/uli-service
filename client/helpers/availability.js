export const roundAvailability = (value) => {
  const valueAsPercentage = value * 100;
  let result = valueAsPercentage;
  if (valueAsPercentage > 0 && valueAsPercentage < 1) {
    result = " < 1";
  } else if (valueAsPercentage >= 1 && valueAsPercentage < 99.5) {
    result = Math.round(valueAsPercentage);
  } else if (valueAsPercentage >= 99.5 && valueAsPercentage < 100) {
    result = 99;
  }
  return result;
};

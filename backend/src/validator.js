const validateGame = (game) => {
  const errorMessages = [];

  if (!game.name) {
    errorMessages.push("Name is missing.");
  }

  if (!game.launchDate || isNaN(Date.parse(game.launchDate))) {
    errorMessages.push("LaunchDate is missing or invalid.");
  }

  if (!game.price || game.price < 0) {
    errorMessages.push("Price is missing or invalid.");
  }

  if (game.isCracked === null) {
    errorMessages.push("IsCracked is missing.");
  }

  return errorMessages.length > 0 ? errorMessages : null;
};

export default validateGame;
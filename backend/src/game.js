class Game {
  constructor({ id, name, price, launchDate, isCracked, version, userId }) {
    this._id = id;
    this.name = name;
    this.price = price;
    this.launchDate = launchDate;
    this.isCracked = isCracked;
    this.version = version;
    this.userId = userId;
  }
}

export default Game;
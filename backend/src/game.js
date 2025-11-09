class Game {
  constructor({
    id,
    name,
    price,
    launchDate,
    isCracked,
    version,
    userId,
    photo,
    lat,
    lng,
  }) {
    this._id = id;
    this.name = name;
    this.price = price;
    this.launchDate = launchDate;
    this.isCracked = isCracked;
    this.version = version;
    this.userId = userId;
    // optional photo (data URL or path)
    this.photo = photo;
    // optional coordinates
    this.lat = lat;
    this.lng = lng;
  }
}

export default Game;

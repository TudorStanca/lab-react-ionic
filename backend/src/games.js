import Datastore from "@seald-io/nedb";
import validateGame from "./validator.js";

class GameStore {
  constructor({ filename, autoload }) {
    this.store = new Datastore({ filename, autoload });
    this.store.loadDatabase();
  }

  async find(props) {
    return this.store.find(props);
  }

  async findOne(props) {
    return this.store.findOne(props);
  }

  async insert(game) {
    const errorMessage = validateGame(game);

    if (errorMessage) {
      throw new Error(errorMessage.join(" "));
    }

    return new Promise((resolve, reject) => {
      this.store.insert(game, (err, newDoc) => {
        if (err) return reject(err);
        resolve(newDoc);
      });
    });
  }

  async update(props, game) {
    const errorMessage = validateGame(game);

    if (errorMessage) {
      throw new Error(errorMessage.join(" "));
    }

    const updatePayload = { ...game };
    delete updatePayload._id;

    return new Promise((resolve, reject) => {
      this.store.update(
        props,
        { $set: updatePayload },
        { multi: false },
        (err, numAffected) => {
          if (err) return reject(err);
          resolve(numAffected);
        }
      );
    });
  }

  async remove(props) {
    return new Promise((resolve, reject) => {
      this.store.remove(props, { multi: false }, (err, numRemoved) => {
        if (err) return reject(err);
        resolve(numRemoved);
      });
    });
  }
}

export default GameStore;

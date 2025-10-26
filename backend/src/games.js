import Datastore from "@seald-io/nedb";
import validateGame from "./validator.js";

class GameStore {
  constructor({ filename, autoload }) {
    this.store = new Datastore({ filename, autoload });
    this.store.loadDatabase();
  }

  async find(props, options = {}) {
    const { skip = 0, limit = 0, sort = {} } = options;

    return new Promise((resolve, reject) => {
      this.store.count(props, (err, count) => {
        if (err) return reject(err);

        let cursor = this.store.find(props).sort(sort);
        if (skip) cursor = cursor.skip(skip);
        if (limit) cursor = cursor.limit(limit);

        cursor.exec((err2, docs) => {
          if (err2) return reject(err2);
          resolve({ games: docs, total: count });
        });
      });
    });
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

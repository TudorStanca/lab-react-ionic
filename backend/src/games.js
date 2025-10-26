import Datastore from '@seald-io/nedb';
import validateGame from './validator.js';

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

        return this.store.insert(game);
    }

    async update(props, game) {
        const errorMessage = validateGame(game);

        if (errorMessage) {
            throw new Error(errorMessage.join(" "));
        }

        const { numAffected } = await this.store.update(props, { $set: game }, { multi: false });
        return numAffected;
    }

    async remove(props) {
        const numRemoved = await this.store.remove(props, { multi: false });
        return numRemoved;
    }
}

export default GameStore;
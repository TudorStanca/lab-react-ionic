interface Game {
  _id?: string;
  name: string;
  price: number;
  launchDate: string;
  isCracked: boolean;
  version: number;
}

export default Game;

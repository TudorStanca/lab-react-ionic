interface Game {
  _id?: string;
  name: string;
  price: number;
  launchDate: string;
  isCracked: boolean;
  version: number;
  photo?: string;
  lat?: number;
  lng?: number;
}

export default Game;

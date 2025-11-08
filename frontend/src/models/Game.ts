interface Game {
  _id?: string;
  name: string;
  price: number;
  launchDate: string;
  isCracked: boolean;
  version: number;
  // optional in-memory or data-url photo, e.g. "data:image/jpeg;base64,..."
  photo?: string;
  // optional local filesystem path where a copy of the photo is stored (frontend only)
  localPhotoPath?: string;
}

export default Game;

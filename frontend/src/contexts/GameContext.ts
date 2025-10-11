import { createContext, useContext } from "react";
import Game from "../models/Game";

export type SaveGameFunctionType = (game: Game) => Promise<void>;

export interface GamesState {
  games?: Game[];
  fetching: boolean;
  fetchingError?: Error | null;
  saving: boolean;
  savingError?: Error | null;
  saveGame?: SaveGameFunctionType;
}

export const initialGameState: GamesState = {
  games: [],
  fetching: false,
  fetchingError: null,
  saving: false,
  savingError: null,
  saveGame: async () => {
    throw new Error("GameProvider not mounted");
  },
};

const GameContext = createContext<GamesState>(initialGameState);

export const useGames = (): GamesState => {
  const ctx = useContext(GameContext);

  if (!ctx) {
    throw new Error("useGames must be used within a GameProvider");
  }

  return ctx;
};

export default GameContext;

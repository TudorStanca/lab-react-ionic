import { createContext, useContext } from "react";
import Game from "../models/Game";

export type SaveGameFunctionType = (game: Game) => Promise<void>;
export type LoadMoreFunctionType = () => Promise<void>;
export type SearchFunctionType = (q?: string, isCracked?: boolean) => Promise<void>;
export type RetryPendingFunctionType = () => Promise<void>;

export interface GamesState {
  games?: Game[];
  fetching: boolean;
  fetchingError?: Error | null;

  page?: number;
  pageSize?: number;
  hasMore?: boolean;

  saving: boolean;
  savingError?: Error | null;
  saveGame?: SaveGameFunctionType;
  loadMore?: LoadMoreFunctionType;
  search?: SearchFunctionType;
  pendingCount?: number;
  retryPending?: RetryPendingFunctionType;
}

export const initialGameState: GamesState = {
  games: [],
  fetching: false,
  fetchingError: null,
  page: 0,
  pageSize: 20,
  hasMore: true,
  saving: false,
  savingError: null,
  saveGame: async () => {
    throw new Error("GameProvider not mounted");
  },
  loadMore: async () => {
    throw new Error("GameProvider not mounted");
  },
  search: async () => {
    throw new Error("GameProvider not mounted");
  },
  pendingCount: 0,
  retryPending: async () => {
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

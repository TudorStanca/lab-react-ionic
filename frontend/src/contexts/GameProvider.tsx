import { ReactNode, useCallback, useEffect, useReducer, useState } from "react";
import Game from "../models/Game";
import { createGame, getGames, newWebSocket, updateGame } from "../services/GameApi";
import GameContext, { GamesState, initialGameState, SaveGameFunctionType } from "./GameContext";
import { getLogger } from "../utils/AppLogger";
import { handleApiError } from "../services/ErrorHandler";
import { useAuth } from "./AuthContext";

const log = getLogger("GameProvider");

interface GameProviderProps {
  children: ReactNode;
}

const FETCH_GAMES_STARTED = "FETCH_GAMES_STARTED" as const;
const FETCH_GAMES_SUCCEEDED = "FETCH_GAMES_SUCCEEDED" as const;
const FETCH_GAMES_FAILED = "FETCH_GAMES_FAILED" as const;
const SAVE_GAMES_STARTED = "SAVE_GAMES_STARTED" as const;
const SAVE_GAMES_SUCCEEDED = "SAVE_GAMES_SUCCEEDED" as const;
const SAVE_GAMES_FAILED = "SAVE_GAMES_FAILED" as const;

type Action =
  | { type: typeof FETCH_GAMES_STARTED }
  | { type: typeof FETCH_GAMES_SUCCEEDED; payload: { games: Game[]; append?: boolean; total?: number } }
  | { type: typeof FETCH_GAMES_FAILED; payload: { error: Error } }
  | { type: typeof SAVE_GAMES_STARTED }
  | { type: typeof SAVE_GAMES_SUCCEEDED; payload: { game: Game } }
  | { type: typeof SAVE_GAMES_FAILED; payload: { error: Error } };

const reducer: (state: GamesState, action: Action) => GamesState = (state, action) => {
  switch (action.type) {
    case FETCH_GAMES_STARTED:
      return { ...state, fetching: true, fetchingError: null };
    case FETCH_GAMES_SUCCEEDED: {
      const existing = state.games || [];
      const incoming = action.payload.games || [];
      const games = action.payload.append ? [...existing, ...incoming] : incoming;
      const hasMore = typeof action.payload.total === 'number' ? action.payload.total > games.length : true;

      return { ...state, fetching: false, games, hasMore };
    }
    case FETCH_GAMES_FAILED:
      return { ...state, fetching: false, fetchingError: action.payload.error };
    case SAVE_GAMES_STARTED:
      return { ...state, saving: true, savingError: null };
    case SAVE_GAMES_SUCCEEDED: {
      const games = [...(state.games || [])];
      const game = action.payload.game;
      const index = games.findIndex((g) => g._id === game._id);

      if (index === -1) {
        games.splice(0, 0, game);
      } else {
        games[index] = game;
      }

      return { ...state, saving: false, games };
    }
    case SAVE_GAMES_FAILED:
      return { ...state, saving: false, savingError: action.payload.error };
    default:
      return state;
  }
};

const GameProvider = ({ children }: GameProviderProps) => {
  const { token } = useAuth();

  const [state, dispatch] = useReducer(reducer, initialGameState);
  const { games, fetching, fetchingError, saving, savingError, hasMore } = state;
  const [page, setPage] = useState<number>(0);
  const pageSize = 15;

  const getGamesEffect = () => {
    if (!token) {
      return;
    }

    let canceled = false;

    const fetchGamesPage = async (pageToLoad = 0, append = false) => {
      try {
        if (!append) dispatch({ type: FETCH_GAMES_STARTED });

        const skip = pageToLoad * pageSize;
        const result = await getGames(skip, pageSize);

        log("fetchGames succeeded", result);

        if (!canceled) {
          dispatch({ type: FETCH_GAMES_SUCCEEDED, payload: { games: result.games, append, total: result.total } });
          setPage(pageToLoad);
        }
      } catch (error) {
        log("fetchGames failed", handleApiError(error));

        if (!canceled) {
          dispatch({ type: FETCH_GAMES_FAILED, payload: { error: error as Error } });
        }
      }
    };

    fetchGamesPage(0, false);

    return () => {
      canceled = true;
    };
  };

  const saveGameCallback = async (game: Game) => {
    try {
      log("saveGame started");
      dispatch({ type: SAVE_GAMES_STARTED });

      const savedGame = await (game._id ? updateGame(game._id, game) : createGame(game));

      log("saveGame succeeded");
      dispatch({ type: SAVE_GAMES_SUCCEEDED, payload: { game: savedGame } });
    } catch (error) {
      log("saveGame failed", handleApiError(error));
      dispatch({ type: SAVE_GAMES_FAILED, payload: { error: error as Error } });

      throw error;
    }
  };

  const wsEffect = () => {
    if (!token) {
      return;
    }
    
    let canceled = false;
    log("wsEffect - connecting");

    const closeWebSocket = newWebSocket((message) => {
      if (canceled) {
        return;
      }

      log("ws raw message:", message);

      const { type, payload } = message || {};
      const game = payload && payload.game;

      if (!type || !payload) {
        log("ws: missing type or payload", message);
        return;
      }

      log(`WebSocket message, type=${type}`);

      if ((type === "created" || type === "updated") && game) {
        dispatch({ type: SAVE_GAMES_SUCCEEDED, payload: { game } });
      }
    });

    return () => {
      log("wsEffect - disconnecting");
      canceled = true;

      closeWebSocket();
    };
  };

  useEffect(getGamesEffect, [token, setPage]);

  const loadMore = useCallback(async () => {
    if (!token) return;
    if (!hasMore) return;

    const nextPage = page + 1;
    const skip = nextPage * pageSize;

    try {
      dispatch({ type: FETCH_GAMES_STARTED });
      const result = await getGames(skip, pageSize);
      dispatch({ type: FETCH_GAMES_SUCCEEDED, payload: { games: result.games, append: true, total: result.total } });
      setPage(nextPage);
    } catch (error) {
      dispatch({ type: FETCH_GAMES_FAILED, payload: { error: error as Error } });
    }
  }, [page, pageSize, token, hasMore]);

  useEffect(wsEffect, [token]);

  const saveGame = useCallback<SaveGameFunctionType>(saveGameCallback, []);
  const value = { games, fetching, fetchingError, saving, savingError, saveGame, loadMore };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export default GameProvider;

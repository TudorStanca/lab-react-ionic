import { useCallback, useEffect, useReducer } from "react";
import Game from "../models/Game";
import { createGame, getGames, updateGame } from "../services/GameApi";
import GameContext, { GamesState, initialGameState, SaveGameFunctionType } from "./GameContext";
import { getLogger } from "../utils/AppLogger";

const log = getLogger("GameProvider");

interface GameProviderProps {
  children: React.ReactNode;
}

const FETCH_GAMES_STARTED = "FETCH_GAMES_STARTED" as const;
const FETCH_GAMES_SUCCEEDED = "FETCH_GAMES_SUCCEEDED" as const;
const FETCH_GAMES_FAILED = "FETCH_GAMES_FAILED" as const;
const SAVE_GAMES_STARTED = "SAVE_GAMES_STARTED" as const;
const SAVE_GAMES_SUCCEEDED = "SAVE_GAMES_SUCCEEDED" as const;
const SAVE_GAMES_FAILED = "SAVE_GAMES_FAILED" as const;

type Action =
  | { type: typeof FETCH_GAMES_STARTED }
  | { type: typeof FETCH_GAMES_SUCCEEDED; payload: { games: Game[] } }
  | { type: typeof FETCH_GAMES_FAILED; payload: { error: Error } }
  | { type: typeof SAVE_GAMES_STARTED }
  | { type: typeof SAVE_GAMES_SUCCEEDED; payload: { game: Game } }
  | { type: typeof SAVE_GAMES_FAILED; payload: { error: Error } };

const reducer: (state: GamesState, action: Action) => GamesState = (state, action) => {
  switch (action.type) {
    case FETCH_GAMES_STARTED:
      return { ...state, fetching: true, fetchingError: null };
    case FETCH_GAMES_SUCCEEDED:
      return { ...state, fetching: false, games: action.payload.games };
    case FETCH_GAMES_FAILED:
      return { ...state, fetching: false, fetchingError: action.payload.error };
    case SAVE_GAMES_STARTED:
      return { ...state, saving: true, savingError: null };
    case SAVE_GAMES_SUCCEEDED: {
      const games = [...(state.games || [])];
      const game = action.payload.game;
      const index = games.findIndex((g) => g.id === game.id);

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

export const GameProvider = ({ children }: GameProviderProps) => {
  const [state, dispatch] = useReducer(reducer, initialGameState);
  const { games, fetching, fetchingError, saving, savingError } = state;

  const getGamesEffect = () => {
    let canceled = false;

    const fetchGames = async () => {
      try {
        log("fetchGames started");
        dispatch({ type: FETCH_GAMES_STARTED });

        const games = await getGames();

        log("fetchGames succeeded");

        if (!canceled) {
          dispatch({ type: FETCH_GAMES_SUCCEEDED, payload: { games } });
        }
      } catch (error) {
        log("fetchGames failed", error);

        if (!canceled) {
          dispatch({ type: FETCH_GAMES_FAILED, payload: { error: error as Error } });
        }
      }
    };

    fetchGames();

    return () => {
      canceled = true;
    };
  };

  const saveItemCallback = async (game: Game) => {
    try {
      log("saveGame started");
      dispatch({ type: SAVE_GAMES_STARTED });

      const savedGame = await (game.id ? updateGame(game.id, game) : createGame(game));

      log("saveGame succeeded");
      dispatch({ type: SAVE_GAMES_SUCCEEDED, payload: { game: savedGame } });
    } catch (error) {
      log("saveGame failed", error);
      dispatch({ type: SAVE_GAMES_FAILED, payload: { error: error as Error } });
    }
  };

  useEffect(getGamesEffect, []);

  const saveGame = useCallback<SaveGameFunctionType>(saveItemCallback, []);
  const value = { games, fetching, fetchingError, saving, savingError, saveGame };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export default GameProvider;

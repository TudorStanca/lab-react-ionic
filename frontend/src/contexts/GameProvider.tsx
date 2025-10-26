import { ReactNode, useCallback, useEffect, useReducer, useState } from "react";
import Game from "../models/Game";
import { createGame, getGames, newWebSocket, updateGame } from "../services/GameApi";
import GameContext, { GamesState, initialGameState, SaveGameFunctionType } from "./GameContext";
import { getLogger } from "../utils/AppLogger";
import { handleApiError } from "../services/ErrorHandler";
import { useAuth } from "./AuthContext";
import { useNetwork } from "../hooks/useNetwork";

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
const REMOVE_LOCAL_PENDING = "REMOVE_LOCAL_PENDING" as const;

type Action =
  | { type: typeof FETCH_GAMES_STARTED }
  | { type: typeof FETCH_GAMES_SUCCEEDED; payload: { games: Game[]; append?: boolean; total?: number } }
  | { type: typeof FETCH_GAMES_FAILED; payload: { error: Error } }
  | { type: typeof SAVE_GAMES_STARTED }
  | { type: typeof SAVE_GAMES_SUCCEEDED; payload: { game: Game } }
  | { type: typeof SAVE_GAMES_FAILED; payload: { error: Error } }
  | { type: typeof REMOVE_LOCAL_PENDING; payload: { localId: string } };

const reducer: (state: GamesState, action: Action) => GamesState = (state, action) => {
  switch (action.type) {
    case FETCH_GAMES_STARTED:
      return { ...state, fetching: true, fetchingError: null };
    case FETCH_GAMES_SUCCEEDED: {
      const existing = state.games || [];
      const incoming = action.payload.games || [];
      const games = action.payload.append ? [...existing, ...incoming] : incoming;
      const hasMore = typeof action.payload.total === "number" ? action.payload.total > games.length : true;

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
    case REMOVE_LOCAL_PENDING: {
      const payload = action as unknown as { payload: { localId: string } };
      const localId = payload.payload.localId;
      const games = (state.games || []).filter((g) => g._id !== localId);
      return { ...state, games };
    }
    default:
      return state;
  }
};

const GameProvider = ({ children }: GameProviderProps) => {
  const { token } = useAuth();

  const [state, dispatch] = useReducer(reducer, initialGameState);
  const { games, fetching, fetchingError, saving, savingError, hasMore } = state;
  const [page, setPage] = useState<number>(0);
  const [query, setQuery] = useState<string | undefined>(undefined);
  const [filterIsCracked, setFilterIsCracked] = useState<boolean | undefined>(undefined);
  const pageSize = 15;
  const { networkStatus } = useNetwork();

  const [pendingOffline, setPendingOffline] = useState<Game[]>(() => {
    try {
      const stored = localStorage.getItem("pendingOfflineGames");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const persistPendingOffline = (items: Game[]) => {
    try {
      localStorage.setItem("pendingOfflineGames", JSON.stringify(items));
    } catch {
      // ignore
    }
  };

  const makeLocalId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const isLocalId = (id?: string) => typeof id === "string" && id.startsWith("local-");

  const enqueuePendingOffline = (game: Game) => {
    // ensure the game has a stable local id so it can be edited while offline
    const localGame: Game & { __pending?: boolean } = { ...(game as unknown as Game) } as Game & {
      __pending?: boolean;
    };
    if (!localGame._id || !isLocalId(localGame._id)) {
      localGame._id = makeLocalId();
    }
    localGame.__pending = true;

    setPendingOffline((prev) => {
      // replace existing pending with same _id, otherwise append
      const idx = prev.findIndex((p) => p._id === localGame._id);
      let next: Game[];
      if (idx >= 0) {
        next = prev.slice();
        next[idx] = localGame;
      } else {
        next = [...prev, localGame];
      }
      persistPendingOffline(next);

      // also reflect immediately in the UI list by adding/updating state.games
      dispatch({ type: SAVE_GAMES_SUCCEEDED, payload: { game: localGame } as unknown as { game: Game } });

      return next;
    });
  };

  const flushPendingOffline = useCallback(async () => {
    if (!token) return;
    if (!pendingOffline || pendingOffline.length === 0) return;

    const remaining: Game[] = [];

    for (const g of pendingOffline) {
      try {
        // if local id, treat as create (server doesn't know local ids)
        const gid = (g as Game)._id;
        if (isLocalId(gid)) {
          // send without the temporary _id and pending marker
          const payload = { ...(g as unknown as Record<string, unknown>) } as Record<string, unknown>;
          delete payload._id;
          // remove any local-only flags
          delete (payload as unknown as Record<string, unknown>)["__pending"];
          const saved = await createGame(payload as unknown as Game);
          // add saved game to state and remove local pending entry
          dispatch({ type: SAVE_GAMES_SUCCEEDED, payload: { game: saved } as unknown as { game: Game } });
          dispatch({ type: REMOVE_LOCAL_PENDING, payload: { localId: gid! } as unknown as { localId: string } });
        } else if (gid) {
          const updated = await updateGame(gid, g);
          dispatch({ type: SAVE_GAMES_SUCCEEDED, payload: { game: updated } as unknown as { game: Game } });
          // ensure any local pending with same id is removed
          dispatch({ type: REMOVE_LOCAL_PENDING, payload: { localId: gid } as unknown as { localId: string } });
        } else {
          const saved = await createGame(g);
          dispatch({ type: SAVE_GAMES_SUCCEEDED, payload: { game: saved } as unknown as { game: Game } });
        }
      } catch {
        remaining.push(g);
      }
    }

    setPendingOffline(remaining);
    persistPendingOffline(remaining);

    // refresh list if some were sent
    if (remaining.length < pendingOffline.length) {
      try {
        const result = await getGames(0, pageSize, query, filterIsCracked);
        dispatch({ type: FETCH_GAMES_SUCCEEDED, payload: { games: result.games, append: false, total: result.total } });
        setPage(0);
      } catch {
        // ignore
      }
    }
  }, [pendingOffline, token, pageSize, query, filterIsCracked]);

  const getGamesEffect = () => {
    if (!token) {
      return;
    }

    let canceled = false;

    const fetchGamesPage = async (pageToLoad = 0, append = false) => {
      try {
        if (!append) dispatch({ type: FETCH_GAMES_STARTED });

        const skip = pageToLoad * pageSize;
        const result = await getGames(skip, pageSize, query, filterIsCracked);

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

      let savedGame: Game;
      // if this is a locally-created game (_id is local-...), and we're online, create on server
      const gid = (game as Game)._id;
      if (isLocalId(gid)) {
        const payload = { ...(game as unknown as Record<string, unknown>) } as Record<string, unknown>;
        delete payload._id;
        delete (payload as unknown as Record<string, unknown>)["__pending"];
        savedGame = await createGame(payload as unknown as Game);
        // replace local pending entry
        dispatch({ type: SAVE_GAMES_SUCCEEDED, payload: { game: savedGame } as unknown as { game: Game } });
        dispatch({ type: REMOVE_LOCAL_PENDING, payload: { localId: gid! } as unknown as { localId: string } });
      } else if (game._id) {
        savedGame = await updateGame(game._id, game);
        dispatch({ type: SAVE_GAMES_SUCCEEDED, payload: { game: savedGame } as unknown as { game: Game } });
      } else {
        savedGame = await createGame(game);
        dispatch({ type: SAVE_GAMES_SUCCEEDED, payload: { game: savedGame } as unknown as { game: Game } });
      }

      log("saveGame succeeded");
    } catch (error) {
      log("saveGame failed", handleApiError(error));
      // Decide whether to enqueue for retry: enqueue when offline, on network errors (no response), or server 5xx
      try {
        const err = error as unknown as { response?: { status?: number } };
        const hasResponse = !!err && !!err.response;
        const status: number | undefined = hasResponse ? err.response!.status : undefined;
        const isNetworkError = !hasResponse;
        const isServerError = typeof status === "number" && status >= 500;
        const isOnline = networkStatus && networkStatus.connected;

        if (!isOnline || isNetworkError || isServerError) {
          enqueuePendingOffline(game);
        }
      } catch {
        // if introspection fails, only enqueue when offline
        if (!(networkStatus && networkStatus.connected)) {
          enqueuePendingOffline(game);
        }
      }

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

  useEffect(getGamesEffect, [token, query, filterIsCracked]);

  const loadMore = useCallback(async () => {
    if (!token) return;
    if (!hasMore) return;

    const nextPage = page + 1;
    const skip = nextPage * pageSize;

    try {
      dispatch({ type: FETCH_GAMES_STARTED });
      const result = await getGames(skip, pageSize, query, filterIsCracked);
      dispatch({ type: FETCH_GAMES_SUCCEEDED, payload: { games: result.games, append: true, total: result.total } });
      setPage(nextPage);
    } catch (error) {
      dispatch({ type: FETCH_GAMES_FAILED, payload: { error: error as Error } });
    }
  }, [page, pageSize, token, hasMore, query, filterIsCracked]);

  useEffect(wsEffect, [token]);

  useEffect(() => {
    if (networkStatus && networkStatus.connected) {
      flushPendingOffline();
    }
  }, [networkStatus, flushPendingOffline]);

  const saveGame: SaveGameFunctionType = saveGameCallback;

  const search = useCallback(async (q?: string, isCracked?: boolean) => {
    setQuery(q);
    setFilterIsCracked(isCracked);
    return Promise.resolve();
  }, []);

  const value = {
    games,
    fetching,
    fetchingError,
    saving,
    savingError,
    pendingCount: pendingOffline.length,
    retryPending: flushPendingOffline,
    saveGame,
    loadMore,
    search,
    page,
    pageSize,
    hasMore,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export default GameProvider;

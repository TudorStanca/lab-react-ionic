import axios from "axios";
import Game from "../models/Game";
import { getLogger } from "../utils/AppLogger";

const log = getLogger("GameApi");

interface MessageData {
  type: string;
  payload: {
    game: Game;
  };
}

const api = axios.create({
  baseURL: "http://localhost:3000/api/games",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers = config.headers || {};
    config.headers["Authorization"] = `Bearer ${token}`;
  }

  return config;
});

export const getGames = async (
  skip = 0,
  limit = 20,
  q?: string,
  isCracked?: boolean
): Promise<{ games: Game[]; total: number }> => {
  const params: string[] = [`skip=${skip}`, `limit=${limit}`];

  if (q) params.push(`q=${encodeURIComponent(q)}`);
  if (typeof isCracked !== "undefined") params.push(`isCracked=${isCracked}`);

  const qs = params.length ? `?${params.join("&")}` : "";
  const response = await api.get<{ games: Game[]; total: number }>(`/${qs}`);

  log("getGames response:", response);

  return response.data;
};

export const getGameById = async (id: string): Promise<Game> => {
  const response = await api.get<Game>(`/${id}`);

  log("getGameById response:", response);

  return response.data;
};

export const createGame = async (game: Game): Promise<Game> => {
  const response = await api.post<Game>("/", game);

  log("createGame response:", response);

  return response.data;
};

export const updateGame = async (id: string, game: Game): Promise<Game> => {
  const response = await api.put<Game>(`/${id}`, game, {
    headers: {
      ETag: `${game.version}`,
    },
  });

  log("updateGame response:", response);

  return response.data;
};

export const deleteGame = async (id: string): Promise<void> => {
  await api.delete(`/${id}`);

  log("deleteGame completed for id:", id);
};

export const newWebSocket = (onMessage: (data: MessageData) => void) => {
  const ws = new WebSocket(`ws://localhost:3000`);
  ws.onopen = () => {
    log("web socket onopen");
    const token = localStorage.getItem("token");

    if (token) {
      ws.send(JSON.stringify({ type: "authorization", payload: { token } }));
    }
  };
  ws.onclose = () => {
    log("web socket onclose");
  };
  ws.onerror = (error) => {
    log("web socket onerror", error);
  };
  ws.onmessage = (messageEvent) => {
    log("web socket onmessage");
    onMessage(JSON.parse(messageEvent.data));
  };
  return () => {
    ws.close();
  };
};

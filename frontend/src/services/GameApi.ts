import axios from "axios";
import Game from "../models/Game";
import { getLogger } from "../utils/AppLogger";

const log = getLogger("GameApi");

interface MessageData {
  event: string;
  payload: {
    game: Game;
  };
}

const api = axios.create({
  baseURL: "http://localhost:3000",
  headers: {
    "Content-Type": "application/json",
  },
});

export const getGames = async (): Promise<Game[]> => {
  const response = await api.get<Game[]>("/games");

  log("getGames response:", response);

  return response.data;
};

export const getGameById = async (id: string): Promise<Game> => {
  const response = await api.get<Game>(`/games/${id}`);

  log("getGameById response:", response);

  return response.data;
};

export const createGame = async (game: Game): Promise<Game> => {
  const response = await api.post<Game>("/games", game);

  log("createGame response:", response);

  return response.data;
};

export const updateGame = async (id: string, game: Game): Promise<Game> => {
  const response = await api.put<Game>(`/games/${id}`, game, {
    headers: {
      ETag: `${game.version}`,
    },
  });

  log("updateGame response:", response);

  return response.data;
};

export const deleteGame = async (id: string): Promise<void> => {
  await api.delete(`/games/${id}`);

  log("deleteGame completed for id:", id);
};

export const newWebSocket = (onMessage: (data: MessageData) => void) => {
  const ws = new WebSocket(`ws://localhost:3000`);
  ws.onopen = () => {
    log("web socket onopen");
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

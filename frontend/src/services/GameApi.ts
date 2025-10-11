import axios from "axios";
import Game from "../models/Game";

const api = axios.create({
  baseURL: "http://localhost:3000",
  headers: {
    "Content-Type": "application/json",
  },
});

export const getGames = async (): Promise<Game[]> => {
  const response = await api.get<Game[]>("/games");

  return response.data;
};

export const getGameById = async (id: string): Promise<Game> => {
  const response = await api.get<Game>(`/games/${id}`);

  return response.data;
};

export const createGame = async (game: Game): Promise<Game> => {
  const response = await api.post<Game>("/games", game);

  return response.data;
};

export const updateGame = async (id: string, game: Game): Promise<Game> => {
  const response = await api.put<Game>(`/games/${id}`, game, {
    headers: {
      ETag: `${game.version}`,
    },
  });
  return response.data;
};

export const deleteGame = async (id: string): Promise<void> => {
  await api.delete(`/games/${id}`);
};

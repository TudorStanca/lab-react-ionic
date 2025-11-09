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
  if (game.photo && typeof game.photo === "string" && game.photo.startsWith("data:")) {
    const form = new FormData();
    form.append("name", String(game.name));
    form.append("price", String(game.price));
    form.append("launchDate", String(game.launchDate));
    form.append("isCracked", String(game.isCracked));
    if (typeof game.lat !== "undefined") form.append("lat", String(game.lat));
    if (typeof game.lng !== "undefined") form.append("lng", String(game.lng));

    const arr = game.photo.split(",");
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const ext = mime.includes("png") ? "png" : "jpeg";
    const file = new File([u8arr], `photo.${ext}`, { type: mime });
    form.append("photo", file);

    const response = await api.post<FormData, { data: Game }>("/", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    log("createGame response:", response);
    return response.data;
  }

  const response = await api.post<Game>("/", game);

  log("createGame response:", response);

  return response.data;
};

export const updateGame = async (id: string, game: Game): Promise<Game> => {
  if (game.photo && typeof game.photo === "string" && game.photo.startsWith("data:")) {
    const form = new FormData();
    form.append("name", String(game.name));
    form.append("price", String(game.price));
    form.append("launchDate", String(game.launchDate));
    form.append("isCracked", String(game.isCracked));
    if (typeof game.version !== "undefined") form.append("version", String(game.version));
    if (typeof game.lat !== "undefined") form.append("lat", String(game.lat));
    if (typeof game.lng !== "undefined") form.append("lng", String(game.lng));

    const arr = game.photo.split(",");
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const ext = mime.includes("png") ? "png" : "jpeg";
    const file = new File([u8arr], `photo.${ext}`, { type: mime });
    form.append("photo", file);

    const response = await api.put<FormData, { data: Game }>(`/${id}`, form, {
      headers: { ETag: `${game.version}`, "Content-Type": "multipart/form-data" },
    });

    log("updateGame response:", response);
    return response.data;
  }

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

export const getGamePhoto = async (id: string): Promise<string | null> => {
  try {
    const response = await api.get(`/${id}/photo`, {
      responseType: "blob",
    });

    const blob = response.data;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    log("Failed to fetch photo for game:", id, error);
    return null;
  }
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

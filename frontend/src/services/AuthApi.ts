import axios from "axios";
import { getLogger } from "../utils/AppLogger";

const log = getLogger("AuthApi");

const api = axios.create({
  baseURL: "http://localhost:3000/api/auth",
  headers: {
    "Content-Type": "application/json",
  },
});

export const loginUser = async (username: string, password: string): Promise<string> => {
  const response = await api.post<{ token: string }>("/login", { username, password });

  log("login response:", response);

  return response.data.token;
};
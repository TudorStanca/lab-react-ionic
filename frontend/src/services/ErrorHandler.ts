import axios from "axios";

export const handleApiError = (axiosError: unknown): string => {
  if (axios.isAxiosError(axiosError)) {
    return axiosError.response?.data.message;
  }

  return "";
};

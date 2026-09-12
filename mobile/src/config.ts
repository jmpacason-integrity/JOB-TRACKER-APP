import Constants from "expo-constants";

export const API_BASE_URL: string =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) || "http://localhost:4000";

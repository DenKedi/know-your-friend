import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import { API_BASE_URL } from "./lib/api-base";
import "./index.css";

if (API_BASE_URL) {
  setBaseUrl(API_BASE_URL);
}

createRoot(document.getElementById("root")!).render(<App />);

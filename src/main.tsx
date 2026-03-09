import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeAuth } from "./stores/authStore";

initializeAuth();

createRoot(document.getElementById("root")!).render(<App />);

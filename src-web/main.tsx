import { createRoot } from "react-dom/client";
import WebApp from "./App";
import "../src/index.css";
import { initializeAuth } from "@web/stores/authStore";

initializeAuth();

createRoot(document.getElementById("root")!).render(<WebApp />);

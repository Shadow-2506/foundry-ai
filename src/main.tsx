import { createRoot } from "react-dom/client";
import App from "./App";
import "./globals.css";
import { APP_TITLE } from "./lib/version";

document.title = APP_TITLE;

createRoot(document.getElementById("root")!).render(<App />);
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ROOT = path.resolve(__dirname, "..");
export const OLLAMA_DIR = path.join(ROOT, "ollama");
export const MODELFILE_PATH = path.join(OLLAMA_DIR, "Modelfile");
export const CHUNKS_PATH = path.join(__dirname, "data", "chunks.json");

export const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
export const EMBED_MODEL = process.env.EMBED_MODEL || "nomic-embed-text";
export const CHAT_MODEL = process.env.CHAT_MODEL || "gemma2:9b";
export const TOP_K = Number(process.env.TOP_K || 3);
export const SERVER_PORT = Number(process.env.PORT || 8787);

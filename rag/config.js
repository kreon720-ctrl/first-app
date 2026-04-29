import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ROOT = path.resolve(__dirname, "..");
export const OLLAMA_DIR = path.join(ROOT, "ollama");
export const MODELFILE_PATH = path.join(OLLAMA_DIR, "Modelfile");
export const CHUNKS_PATH = path.join(__dirname, "data", "chunks.json");

export const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
// 임베딩과 채팅은 역할이 달라 별도 모델 사용
// - 임베딩: nomic-embed-text (768 dim, 빠름, 한국어 가능)
// - 채팅: gemma4:26b (모델 capability 128K이지만 KV 캐시 절감 위해 호출 시 32K로 고정)
export const EMBED_MODEL = process.env.EMBED_MODEL || "nomic-embed-text";
export const CHAT_MODEL = process.env.CHAT_MODEL || "gemma4:26b";
// 32K 컨텍스트 안에서 parent-document 전문 첨부가 가능한 안전 범위.
export const TOP_K = Number(process.env.TOP_K || 5);
export const SERVER_PORT = Number(process.env.PORT || 8787);

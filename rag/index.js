import fs from "node:fs/promises";
import path from "node:path";
import { chunkFile, listMarkdownFiles } from "./chunker.js";
import { embed } from "./ollamaClient.js";
import { OLLAMA_DIR, CHUNKS_PATH, EMBED_MODEL } from "./config.js";

async function main() {
  console.log(`Indexing sources under: ${OLLAMA_DIR}`);
  const files = await listMarkdownFiles(OLLAMA_DIR);
  if (files.length === 0) {
    console.error("No .md files found. Aborting.");
    process.exit(1);
  }
  console.log(`Found ${files.length} markdown file(s).`);

  const allChunks = [];
  for (const rel of files) {
    const abs = path.join(OLLAMA_DIR, rel);
    const chunks = await chunkFile(abs, rel.replaceAll("\\", "/"));
    console.log(`  ${rel}: ${chunks.length} chunk(s)`);
    allChunks.push(...chunks);
  }

  console.log(`\nTotal chunks: ${allChunks.length}`);
  console.log(`Embedding with model: ${EMBED_MODEL}\n`);

  const embedded = [];
  for (let i = 0; i < allChunks.length; i++) {
    const c = allChunks[i];
    const docInput = `search_document: ${c.source_file} / ${c.section_path}\n${c.text}`;
    const vec = await embed(EMBED_MODEL, docInput);
    embedded.push({ ...c, id: i, embedding: vec });
    if ((i + 1) % 10 === 0 || i === allChunks.length - 1) {
      process.stdout.write(`  embedded ${i + 1}/${allChunks.length}\r`);
    }
  }
  console.log(`\n`);

  await fs.mkdir(path.dirname(CHUNKS_PATH), { recursive: true });
  await fs.writeFile(
    CHUNKS_PATH,
    JSON.stringify(
      {
        model: EMBED_MODEL,
        dim: embedded[0].embedding.length,
        created_at: new Date().toISOString(),
        count: embedded.length,
        chunks: embedded,
      },
      null,
      2
    ),
    "utf8"
  );
  console.log(`Saved ${embedded.length} chunks to ${CHUNKS_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

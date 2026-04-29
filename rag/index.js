import fs from "node:fs/promises";
import path from "node:path";
import { chunkFile, listMarkdownFiles } from "./chunker.js";
import { embed } from "./ollamaClient.js";
import { buildStats } from "./bm25.js";
import { OLLAMA_DIR, CHUNKS_PATH, EMBED_MODEL } from "./config.js";

async function main() {
  console.log(`Indexing sources under: ${OLLAMA_DIR}`);
  const files = await listMarkdownFiles(OLLAMA_DIR);
  if (files.length === 0) {
    console.error("No .md files found. Aborting.");
    process.exit(1);
  }
  console.log(`Found ${files.length} markdown file(s).`);

  // 1. 파일 전문을 parents 맵에 저장 (Parent-Document Retrieval용)
  const parents = {};
  for (const rel of files) {
    parents[rel] = await fs.readFile(path.join(OLLAMA_DIR, rel), "utf8");
  }

  // 2. 모든 청크 수집
  const allChunks = [];
  for (const rel of files) {
    const abs = path.join(OLLAMA_DIR, rel);
    const chunks = await chunkFile(abs, rel.replaceAll("\\", "/"));
    console.log(`  ${rel}: ${chunks.length} chunk(s)`);
    allChunks.push(...chunks);
  }

  console.log(`\nTotal chunks: ${allChunks.length}`);
  console.log(`Embedding with model: ${EMBED_MODEL}`);
  console.log(`(gemma 계열은 청크당 수 초~수십 초 소요. 인내심을 가지세요)\n`);

  // 3. 임베딩
  const embedded = [];
  for (let i = 0; i < allChunks.length; i++) {
    const c = allChunks[i];
    const docInput = `search_document: ${c.source_file} / ${c.section_path}\n${c.text}`;
    const vec = await embed(EMBED_MODEL, docInput);
    embedded.push({ ...c, id: i, embedding: vec });
    process.stdout.write(`  embedded ${i + 1}/${allChunks.length}\r`);
  }
  console.log(`\n`);

  // 4. BM25 통계 계산 (N, avgdl, df)
  const bm25 = buildStats(embedded);
  console.log(
    `BM25 stats: N=${bm25.N}, avgdl=${bm25.avgdl.toFixed(1)}, vocab=${Object.keys(bm25.df).length}`
  );

  // 5. 저장
  await fs.mkdir(path.dirname(CHUNKS_PATH), { recursive: true });
  await fs.writeFile(
    CHUNKS_PATH,
    JSON.stringify(
      {
        model: EMBED_MODEL,
        dim: embedded[0].embedding.length,
        created_at: new Date().toISOString(),
        count: embedded.length,
        bm25,
        chunks: embedded,
        parents,
      },
      null,
      2
    ),
    "utf8"
  );
  console.log(`Saved ${embedded.length} chunks + ${Object.keys(parents).length} parents to ${CHUNKS_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

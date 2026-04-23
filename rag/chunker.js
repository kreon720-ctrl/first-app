import fs from "node:fs/promises";
import path from "node:path";

function roughTokenCount(text) {
  return Math.ceil(text.length / 2.2);
}

function splitBySection(md, headingLevel) {
  const prefix = "#".repeat(headingLevel) + " ";
  const lines = md.split(/\r?\n/);
  const sections = [];
  let currentTitle = null;
  let currentBody = [];

  const flush = () => {
    if (currentTitle === null && currentBody.length === 0) return;
    sections.push({
      title: currentTitle ?? "(intro)",
      body: currentBody.join("\n").trim(),
    });
  };

  for (const line of lines) {
    if (line.startsWith(prefix) && !line.startsWith(prefix + "#")) {
      flush();
      currentTitle = line.slice(prefix.length).trim();
      currentBody = [];
    } else {
      currentBody.push(line);
    }
  }
  flush();
  return sections.filter((s) => s.body.length > 0);
}

function chunkFaq(source, md) {
  const chunks = [];
  const pattern = /(?:^|\n)\s*(?:-\s*)?\*\*Q\*\*:\s*([\s\S]*?)\n\s*\*\*A\*\*:\s*([\s\S]*?)(?=\n\s*(?:-\s*)?\*\*Q\*\*:|\n##\s|\n#\s|$)/g;
  let m;
  let categoryTitle = null;
  const h2 = /^##\s+(.+)$/gm;
  const h2Positions = [];
  let hm;
  while ((hm = h2.exec(md))) {
    h2Positions.push({ index: hm.index, title: hm[1].trim() });
  }
  const titleAt = (idx) => {
    let last = "(intro)";
    for (const h of h2Positions) {
      if (h.index <= idx) last = h.title;
      else break;
    }
    return last;
  };

  while ((m = pattern.exec(md))) {
    const q = m[1].trim();
    const a = m[2].trim();
    categoryTitle = titleAt(m.index);
    const text = `Q: ${q}\nA: ${a}`;
    chunks.push({
      source_file: source,
      section_path: categoryTitle,
      chunk_type: "qa",
      text,
      token_count: roughTokenCount(text),
    });
  }
  return chunks;
}

function chunkSectioned(source, md, { chunkType, maxTokens = 600 }) {
  const chunks = [];
  const h2sections = splitBySection(md, 2);

  for (const section of h2sections) {
    const sectionBody = section.body;
    const combined = `## ${section.title}\n\n${sectionBody}`;
    const tok = roughTokenCount(combined);
    if (tok <= maxTokens) {
      chunks.push({
        source_file: source,
        section_path: section.title,
        chunk_type: chunkType,
        text: combined,
        token_count: tok,
      });
      continue;
    }
    const subs = splitBySection(sectionBody, 3);
    if (subs.length <= 1) {
      chunks.push({
        source_file: source,
        section_path: section.title,
        chunk_type: chunkType,
        text: combined,
        token_count: tok,
      });
      continue;
    }
    for (const sub of subs) {
      const subText = `## ${section.title} / ### ${sub.title}\n\n${sub.body}`;
      chunks.push({
        source_file: source,
        section_path: `${section.title} / ${sub.title}`,
        chunk_type: chunkType,
        text: subText,
        token_count: roughTokenCount(subText),
      });
    }
  }
  return chunks;
}

function typeForFile(relPath) {
  if (relPath.endsWith("faq.md")) return "qa";
  if (relPath.endsWith("glossary.md")) return "glossary";
  if (relPath.endsWith("knowledge-base.md")) return "reference";
  if (relPath.includes("features/")) return "procedure";
  return "reference";
}

export async function chunkFile(absPath, relPath) {
  const md = await fs.readFile(absPath, "utf8");
  if (relPath.endsWith("faq.md")) {
    return chunkFaq(relPath, md);
  }
  const chunkType = typeForFile(relPath);
  return chunkSectioned(relPath, md, { chunkType });
}

export async function chunkDirectory(rootDir, include) {
  const results = [];
  for (const rel of include) {
    const abs = path.join(rootDir, rel);
    try {
      const stat = await fs.stat(abs);
      if (!stat.isFile()) continue;
    } catch {
      continue;
    }
    const chunks = await chunkFile(abs, rel.replaceAll("\\", "/"));
    results.push(...chunks);
  }
  return results;
}

export async function listMarkdownFiles(rootDir) {
  const entries = [];
  async function walk(dir, prefix = "") {
    const items = await fs.readdir(dir, { withFileTypes: true });
    for (const item of items) {
      const abs = path.join(dir, item.name);
      const rel = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.isDirectory()) {
        await walk(abs, rel);
      } else if (
        item.isFile() &&
        item.name.endsWith(".md") &&
        item.name !== "README.md" &&
        item.name !== "system-prompt.md"
      ) {
        entries.push(rel);
      }
    }
  }
  await walk(rootDir);
  return entries;
}

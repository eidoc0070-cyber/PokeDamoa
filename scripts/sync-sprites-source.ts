import * as fs from "node:fs";
import * as path from "node:path";

const BASE_DIR = path.resolve(import.meta.dirname, "../data-source/pokeapi/sprites-master/sprites");
const POKEMON_DIR = path.join(BASE_DIR, "pokemon");
const ITEMS_DIR = path.join(BASE_DIR, "items");

interface TreeItem {
  path: string;
  type: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "PokeDamora-Updater",
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub API 호출 실패 (${res.status}): ${url}`);
  }
  return (await res.json()) as T;
}

async function downloadFile(url: string, destPath: string): Promise<boolean> {
  const res = await fetch(url);
  if (!res.ok) return false;
  const buffer = await res.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(buffer));
  return true;
}

async function syncCategory(label: "pokemon" | "items", destDir: string, filter: (name: string) => boolean) {
  fs.mkdirSync(destDir, { recursive: true });

  console.log(`\n🔍 [${label}] 최신 GitHub 목록 조회 중...`);
  // GitHub REST API를 통해 해당 디렉토리 파일 트리 조회
  const treeData = await fetchJson<{ tree: TreeItem[] }>(
    `https://api.github.com/repos/PokeAPI/sprites/git/trees/master:sprites/${label}`
  );

  const targetFiles = treeData.tree
    .filter((item) => item.type === "blob" && filter(item.path))
    .map((item) => item.path);

  // 이미 로컬에 있는 파일은 건너뛰고 없는 파일만 다운로드 (증분 다운로드)
  const missingFiles = targetFiles.filter((file) => !fs.existsSync(path.join(destDir, file)));

  if (missingFiles.length === 0) {
    console.log(`✨ [${label}] 이미 최신 상태입니다. (총 ${targetFiles.length}개 파일 확인)`);
    return;
  }

  console.log(`📥 [${label}] 새로 추가/누락된 ${missingFiles.length}개 파일 다운로드 시작...`);

  const CONCURRENCY = 30;
  let downloaded = 0;

  for (let i = 0; i < missingFiles.length; i += CONCURRENCY) {
    const chunk = missingFiles.slice(i, i + CONCURRENCY);
    await Promise.all(
      chunk.map(async (fileName) => {
        const rawUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/${label}/${fileName}`;
        const destPath = path.join(destDir, fileName);
        await downloadFile(rawUrl, destPath);
      })
    );
    downloaded += chunk.length;
    const percent = Math.round((downloaded / missingFiles.length) * 100);
    process.stdout.write(`\r   진행률: ${downloaded}/${missingFiles.length} (${percent}%)`);
  }
  console.log(`\n✅ [${label}] 다운로드 완료!`);
}

async function main() {
  console.log("🚀 스프라이트 최신화 동기화 시작 (PokeAPI/sprites)");
  const startTime = Date.now();

  try {
    // 1. 포켓몬 앞면 기본 스프라이트 (숫자.png)
    await syncCategory("pokemon", POKEMON_DIR, (fileName) => /^\d+\.png$/.test(fileName));

    // 2. 아이템 스프라이트 (*.png)
    await syncCategory("items", ITEMS_DIR, (fileName) => fileName.endsWith(".png"));

    const sec = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n🎉 모든 스프라이트 동기화 완료! (${sec}초 소요)`);
  } catch (err) {
    console.error("❌ 스프라이트 동기화 중 오류 발생:", err);
    process.exit(1);
  }
}

main();

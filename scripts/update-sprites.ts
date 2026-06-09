import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CategoryConfig {
    name: string;
    sourceSubDir: string;
    destSubDir: string;
    filter: (filename: string) => boolean;
    options: {
        width: number;
        height: number;
        format: 'webp' | 'avif';
        quality: number;
    };
}

interface AppConfig {
    sourceRoot: string;
    destRoot: string;
    categories: CategoryConfig[];
}

// 설정
const CONFIG: AppConfig = {
    sourceRoot: path.resolve(__dirname, '../data-source/pokeapi/sprites-master/sprites'),
    destRoot: path.resolve(__dirname, '../public/sprites'),
    // 추후 확장성을 위해 카테고리별 설정 분리
    categories: [
        {
            name: 'pokemon',
            sourceSubDir: 'pokemon',
            destSubDir: 'pokemon',
            // 정규표현식으로 필요한 파일만 필터링 (숫자.png 형태의 기본 스프라이트)
            filter: (filename: string) => /^\d+\.png$/.test(filename),
            // 최적화 옵션
            options: {
                width: 96,
                height: 96,
                format: 'webp' as const,
                quality: 80
            }
        },
        {
            name: 'items',
            sourceSubDir: 'items',
            destSubDir: 'items',
            // 아이템은 파일명이 이름(en)으로 되어 있음
            filter: (filename: string) => {
                const fullPath = path.join(path.resolve(__dirname, '../data-source/pokeapi/sprites-master/sprites'), 'items', filename);
                return filename.endsWith('.png') && !fs.statSync(fullPath).isDirectory();
            },
            options: {
                width: 32,
                height: 32,
                format: 'webp' as const,
                quality: 90
            }
        }
    ]
};

async function ensureDir(dir: string) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

async function processImages() {
    console.log('🚀 이미지 최적화 및 복사 시작...');
    const startTime = Date.now();

    for (const category of CONFIG.categories) {
        const sourceDir = path.join(CONFIG.sourceRoot, category.sourceSubDir);
        const destDir = path.join(CONFIG.destRoot, category.destSubDir);

        if (!fs.existsSync(sourceDir)) {
            console.warn(`⚠️ 소스 디렉토리를 찾을 수 없음: ${sourceDir}`);
            continue;
        }

        await ensureDir(destDir);
        
        const files = fs.readdirSync(sourceDir).filter(category.filter);
        console.log(`📦 [${category.name}] 총 ${files.length}개의 파일 처리 중...`);

        let count = 0;
        const total = files.length;

        // 병렬 처리를 위해 청크 단위로 처리 (너무 많으면 메모리 이슈 발생 가능)
        const CHUNK_SIZE = 50;
        for (let i = 0; i < total; i += CHUNK_SIZE) {
            const chunk = files.slice(i, i + CHUNK_SIZE);
            await Promise.all(chunk.map(async (file) => {
                const sourcePath = path.join(sourceDir, file);
                const destFile = file.replace(/\.png$/, `.${category.options.format}`);
                const destPath = path.join(destDir, destFile);

                try {
                    await sharp(sourcePath)
                        .resize(category.options.width, category.options.height, {
                            fit: 'contain',
                            background: { r: 0, g: 0, b: 0, alpha: 0 }
                        })
                        .toFormat(category.options.format, { quality: category.options.quality })
                        .toFile(destPath);
                    count++;
                } catch (err) {
                    console.error(`❌ 파일 처리 실패 (${file}):`, err);
                }
            }));
            
            if (count % 100 === 0 || count === total) {
                console.log(`   进度: ${count}/${total} (${Math.round(count/total * 100)}%)`);
            }
        }
    }

    const endTime = Date.now();
    console.log(`✅ 모든 작업 완료! (소요 시간: ${((endTime - startTime) / 1000).toFixed(2)}초)`);
}

processImages().catch(err => {
    console.error('💥 치명적 오류 발생:', err);
    process.exit(1);
});

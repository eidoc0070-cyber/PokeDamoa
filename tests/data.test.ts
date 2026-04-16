import { expect, test, describe } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { FIELD_EFFECTS } from "../src/data/field-data";

describe("도감 데이터 및 환경 설정 테스트", () => {
    
    test("필드 데이터(FIELD_EFFECTS)가 올바르게 정의되어 있는가", () => {
        expect(FIELD_EFFECTS.length).toBeGreaterThan(0);
        const sun = FIELD_EFFECTS.find(e => e.id === 'sun');
        expect(sun).toBeDefined();
        expect(sun?.nameKo).toBe('쾌청');
        expect(sun?.category).toBe('weather');
    });

    test("생성된 JSON 데이터 파일들이 존재하는가", () => {
        const publicPath = path.resolve(__dirname, "../public");
        const files = [
            "pokedex-data.json",
            "moves-data.json",
            "abilities-data.json",
            "items-data.json"
        ];

        files.forEach(file => {
            const exists = fs.existsSync(path.join(publicPath, file));
            expect(exists).toBe(true);
        });
    });

    test("데이터 파일의 기본 구조가 유효한가", () => {
        const publicPath = path.resolve(__dirname, "../public");
        
        // 기술 데이터 확인
        const movesPath = path.join(publicPath, "moves-data.json");
        if (fs.existsSync(movesPath)) {
            const moves = JSON.parse(fs.readFileSync(movesPath, "utf-8"));
            expect(Array.isArray(moves)).toBe(true);
            if (moves.length > 0) {
                expect(moves[0]).toHaveProperty("nameKo");
                expect(moves[0]).toHaveProperty("effect");
            }
        }

        // 특성 데이터 확인
        const abilitiesPath = path.join(publicPath, "abilities-data.json");
        if (fs.existsSync(abilitiesPath)) {
            const abilities = JSON.parse(fs.readFileSync(abilitiesPath, "utf-8"));
            expect(Array.isArray(abilities)).toBe(true);
            if (abilities.length > 0) {
                expect(abilities[0]).toHaveProperty("nameKo");
                expect(abilities[0]).toHaveProperty("effect");
            }
        }
    });
});

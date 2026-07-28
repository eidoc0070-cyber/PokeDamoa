import { NATURES, type StatKey } from "../../data/constants.js";
import type { PokemonSlot, Stats } from "./types.js";

export interface ParserContext {
    pokemon: any[];
    items: any[];
    moves: any[];
    abilities: any[];
}

const STAT_NAME_MAP: Record<string, StatKey> = {
    HP: "hp",
    Atk: "atk",
    Def: "def",
    SpA: "spa",
    SpD: "spd",
    Spe: "spe",
    "Atk.": "atk",
    "Def.": "def",
    "Sp. Atk": "spa",
    "Sp. Def": "spd",
    체력: "hp",
    공격: "atk",
    방어: "def",
    특수공격: "spa",
    특수방어: "spd",
    스피드: "spe",
};

const REVERSE_STAT_NAME_MAP: Record<"ko" | "en", Record<StatKey, string>> = {
    ko: { hp: "체력", atk: "공격", def: "방어", spa: "특수공격", spd: "특수방어", spe: "스피드" },
    en: { hp: "HP", atk: "Atk", def: "Def", spa: "SpA", spd: "SpD", spe: "Spe" },
};

/**
 * Showdown 텍스트를 파싱하여 PokemonSlot 배열로 변환합니다.
 */
export function parseShowdown(text: string, ctx: ParserContext): PokemonSlot[] {
    const sets = text.split(/\n\s*\n/);
    const slots: PokemonSlot[] = [];

    for (const set of sets) {
        if (!set.trim()) continue;
        const lines = set.split("\n").map((l) => l.trim());
        if (lines.length === 0) continue;

        const slot = createEmptySlot();
        let moveIndex = 0;

        // 첫 번째 줄: Nickname (Species) (Gender) @ Item
        const header = lines[0];
        if (!header) continue;

        const headerRegex = /^([^(@\n]+?)(?: \(([^)\n]+)\))?(?: \((M|F)\))?(?: @ ([^\n]+))?$/;
        const headerMatch = header.match(headerRegex);

        if (headerMatch) {
            const name1 = (headerMatch[1] || "").trim();
            const name2 = headerMatch[2]?.trim();
            const gender = headerMatch[3];
            const itemName = headerMatch[4]?.trim();

            if (name2) {
                slot.nickname = name1;
                slot.pokemonId = findIdByName(ctx.pokemon, name2);
            } else {
                slot.pokemonId = findIdByName(ctx.pokemon, name1);
            }

            if (gender) slot.gender = gender as any;
            if (itemName) slot.itemId = findIdByName(ctx.items, itemName);
        }

        // 나머지 줄 처리
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line) continue;

            if (line.startsWith("- ")) {
                if (moveIndex < 4) {
                    const moveName = line.substring(2).trim();
                    slot.moveIds[moveIndex] = findIdByName(ctx.moves, moveName);
                    moveIndex++;
                }
                continue;
            }

            const abilityMatch = line.match(/^(?:Ability|특성): (.+)$/i);
            if (abilityMatch?.[1]) {
                slot.abilityId = findIdByName(ctx.abilities, abilityMatch[1].trim());
                continue;
            }

            const levelMatch = line.match(/^(?:Level|레벨): (\d+)$/i);
            if (levelMatch?.[1]) {
                slot.level = parseInt(levelMatch[1], 10);
                continue;
            }

            const shinyMatch = line.match(/^(?:Shiny|이로치): (Yes|예)$/i);
            if (shinyMatch) {
                slot.isShiny = true;
                continue;
            }

            const teraMatch = line.match(/^(?:Tera Type|테라타입): (.+)$/i);
            if (teraMatch) {
                // 테라 타입은 상성 데이터에서 이름을 찾아야 하지만 여기서는 단순 매핑 또는 무시 (필요시 추가)
                continue;
            }

            const evMatch = line.match(/^(?:EVs|노력치): (.+)$/i);
            if (evMatch?.[1]) {
                parseStats(evMatch[1], slot.evs);
                continue;
            }

            const ivMatch = line.match(/^(?:IVs|개체값): (.+)$/i);
            if (ivMatch?.[1]) {
                parseStats(ivMatch[1], slot.ivs);
                continue;
            }

            const natureMatch = line.match(/^(.+) (?:Nature|성격)$/i);
            if (natureMatch?.[1]) {
                const nName = natureMatch[1].trim();
                const nature = NATURES.find(
                    (n) => n.nameEn.toLowerCase() === nName.toLowerCase() || n.nameKo === nName,
                );
                if (nature) slot.natureId = nature.id;
            }
        }

        if (slot.pokemonId !== 0) {
            slots.push(slot);
        }
    }

    return slots;
}

/**
 * PokemonSlot 데이터를 Showdown 텍스트로 변환합니다.
 */
export function exportShowdown(slot: PokemonSlot, ctx: ParserContext, lang: "ko" | "en"): string {
    const poke = ctx.pokemon.find((p) => p.id === slot.pokemonId);
    if (!poke) return "";

    let header = "";
    const pokeName = lang === "ko" ? poke.nameKo : poke.nameEn;
    if (slot.nickname) {
        header = `${slot.nickname} (${pokeName})`;
    } else {
        header = pokeName;
    }

    if (slot.gender && slot.gender !== "N") {
        header += ` (${slot.gender})`;
    }

    if (slot.itemId) {
        const item = ctx.items.find((i) => i.id === slot.itemId);
        if (item) {
            header += ` @ ${lang === "ko" ? item.nameKo : item.nameEn}`;
        }
    }

    const lines = [header];

    if (slot.abilityId) {
        const ability = ctx.abilities.find((a) => a.id === slot.abilityId);
        if (ability) {
            lines.push(`${lang === "ko" ? "특성" : "Ability"}: ${lang === "ko" ? ability.nameKo : ability.nameEn}`);
        }
    }

    if (slot.level !== 100) {
        lines.push(`${lang === "ko" ? "레벨" : "Level"}: ${slot.level}`);
    }

    if (slot.isShiny) {
        lines.push(`${lang === "ko" ? "이로치: 예" : "Shiny: Yes"}`);
    }

    // EVs
    const evParts = [];
    for (const stat of ["hp", "atk", "def", "spa", "spd", "spe"] as StatKey[]) {
        if (slot.evs[stat] > 0) {
            const statName = REVERSE_STAT_NAME_MAP[lang][stat];
            evParts.push(lang === "ko" ? `${statName} ${slot.evs[stat]}` : `${slot.evs[stat]} ${statName}`);
        }
    }
    if (evParts.length > 0) {
        lines.push(`${lang === "ko" ? "노력치" : "EVs"}: ${evParts.join(" / ")}`);
    }

    // Nature
    const nature = NATURES.find((n) => n.id === slot.natureId);
    if (nature) {
        lines.push(`${lang === "ko" ? nature.nameKo : nature.nameEn} ${lang === "ko" ? "성격" : "Nature"}`);
    }

    // IVs (31이 아닌 것만 표시)
    const ivParts = [];
    for (const stat of ["hp", "atk", "def", "spa", "spd", "spe"] as StatKey[]) {
        if (slot.ivs[stat] < 31) {
            const statName = REVERSE_STAT_NAME_MAP[lang][stat];
            ivParts.push(lang === "ko" ? `${statName} ${slot.ivs[stat]}` : `${slot.ivs[stat]} ${statName}`);
        }
    }
    if (ivParts.length > 0) {
        lines.push(`${lang === "ko" ? "개체값" : "IVs"}: ${ivParts.join(" / ")}`);
    }

    // Moves
    for (const moveId of slot.moveIds) {
        if (moveId) {
            const move = ctx.moves.find((m) => m.id === moveId);
            if (move) {
                lines.push(`- ${lang === "ko" ? move.nameKo : move.nameEn}`);
            }
        }
    }

    return lines.join("\n");
}

function createEmptySlot(): PokemonSlot {
    return {
        pokemonId: 0,
        moveIds: [null, null, null, null],
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        natureId: 0,
        level: 100,
    };
}

function findIdByName(data: any[], name: string): number {
    const lowerName = name.toLowerCase();
    const item = data.find(
        (d) =>
            d.nameKo === name ||
            d.nameEn.toLowerCase() === lowerName ||
            d.nameEn.toLowerCase().replace(/[^a-z0-9]/g, "") === lowerName.replace(/[^a-z0-9]/g, ""),
    );
    return item ? item.id : 0;
}

function parseStats(text: string, target: Stats) {
    const parts = text.split(" / ");
    for (const part of parts) {
        const match = part.trim().match(/^(.+?)\s+(\d+)$/) || part.trim().match(/^(\d+)\s+(.+)$/);
        if (match) {
            // "공격 252" 또는 "252 Atk" 대응
            let name: string;
            let val: number;

            if (match[1] !== undefined && Number.isNaN(parseInt(match[1], 10))) {
                name = match[1];
                val = parseInt(match[2] || "0", 10);
            } else {
                val = parseInt(match[1] || "0", 10);
                name = match[2] || "";
            }

            const key = STAT_NAME_MAP[name];
            if (key) target[key] = val;
        }
    }
}

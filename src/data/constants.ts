export const POKEMON_TYPES = [
    "normal",
    "fire",
    "water",
    "electric",
    "grass",
    "ice",
    "fighting",
    "poison",
    "ground",
    "flying",
    "psychic",
    "bug",
    "rock",
    "ghost",
    "dragon",
    "dark",
    "steel",
    "fairy",
] as const;

export type PokemonType = (typeof POKEMON_TYPES)[number];

export const TYPE_NAMES_KO: Record<PokemonType, string> = {
    normal: "노말",
    fire: "불꽃",
    water: "물",
    electric: "전기",
    grass: "풀",
    ice: "얼음",
    fighting: "격투",
    poison: "독",
    ground: "땅",
    flying: "비행",
    psychic: "에스퍼",
    bug: "벌레",
    rock: "바위",
    ghost: "고스트",
    dragon: "드래곤",
    dark: "악",
    steel: "강철",
    fairy: "페어리",
};

export const TYPE_COLORS: Record<PokemonType, string> = {
    normal: "#A8A77A",
    fire: "#EE8130",
    water: "#6390F0",
    electric: "#F7D02C",
    grass: "#7AC74C",
    ice: "#96D9D6",
    fighting: "#C22E28",
    poison: "#A33EA1",
    ground: "#E2BF65",
    flying: "#A98FF3",
    psychic: "#F95587",
    bug: "#A6B91A",
    rock: "#B6A136",
    ghost: "#735797",
    dragon: "#6F35FC",
    dark: "#705848",
    steel: "#B7B7CE",
    fairy: "#D685AD",
};

export type StatKey = "hp" | "atk" | "def" | "spa" | "spd" | "spe";

export interface Nature {
    id: number;
    nameKo: string;
    nameEn: string;
    plus?: StatKey;
    minus?: StatKey;
}

export const NATURES: Nature[] = [
    { id: 0, nameKo: "하디", nameEn: "Hardy" },
    { id: 1, nameKo: "외로움", nameEn: "Lonely", plus: "atk", minus: "def" },
    { id: 2, nameKo: "용감", nameEn: "Brave", plus: "atk", minus: "spe" },
    { id: 3, nameKo: "고집", nameEn: "Adamant", plus: "atk", minus: "spa" },
    { id: 4, nameKo: "개구쟁이", nameEn: "Naughty", plus: "atk", minus: "spd" },
    { id: 5, nameKo: "대담", nameEn: "Bold", plus: "def", minus: "atk" },
    { id: 6, nameKo: "온순", nameEn: "Docile" },
    { id: 7, nameKo: "무사태평", nameEn: "Relaxed", plus: "def", minus: "spe" },
    { id: 8, nameKo: "장난꾸러기", nameEn: "Impish", plus: "def", minus: "spa" },
    { id: 9, nameKo: "덜렁거림", nameEn: "Lax", plus: "def", minus: "spd" },
    { id: 10, nameKo: "겁쟁이", nameEn: "Timid", plus: "spe", minus: "atk" },
    { id: 11, nameKo: "성급", nameEn: "Hasty", plus: "spe", minus: "def" },
    { id: 12, nameKo: "진지", nameEn: "Serious" },
    { id: 13, nameKo: "명랑", nameEn: "Jolly", plus: "spe", minus: "spa" },
    { id: 14, nameKo: "천진난만", nameEn: "Naive", plus: "spe", minus: "spd" },
    { id: 15, nameKo: "조심", nameEn: "Modest", plus: "spa", minus: "atk" },
    { id: 16, nameKo: "의젓", nameEn: "Mild", plus: "spa", minus: "def" },
    { id: 17, nameKo: "냉정", nameEn: "Quiet", plus: "spa", minus: "spe" },
    { id: 18, nameKo: "수줍음", nameEn: "Bashful" },
    { id: 19, nameKo: "덜렁", nameEn: "Rash", plus: "spa", minus: "spd" },
    { id: 20, nameKo: "차분", nameEn: "Calm", plus: "spd", minus: "atk" },
    { id: 21, nameKo: "온화", nameEn: "Gentle", plus: "spd", minus: "def" },
    { id: 22, nameKo: "건방", nameEn: "Sassy", plus: "spd", minus: "spe" },
    { id: 23, nameKo: "신중", nameEn: "Careful", plus: "spd", minus: "spa" },
    { id: 24, nameKo: "변덕", nameEn: "Quirky" },
];

// 기본 상성은 무조건 1.0
const defaultMatchups = (): Record<PokemonType, number> =>
    Object.fromEntries(POKEMON_TYPES.map((t) => [t, 1.0])) as Record<PokemonType, number>;

// 구조: TYPE_MATCHUPS[공격자타입][방어자타입] = 배율
export const TYPE_MATCHUPS: Record<PokemonType, Record<PokemonType, number>> = {
    normal: { ...defaultMatchups(), rock: 0.5, ghost: 0, steel: 0.5 },
    fire: {
        ...defaultMatchups(),
        fire: 0.5,
        water: 0.5,
        grass: 2,
        ice: 2,
        bug: 2,
        rock: 0.5,
        dragon: 0.5,
        steel: 2,
        fairy: 0.5,
    },
    water: { ...defaultMatchups(), fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
    electric: { ...defaultMatchups(), water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
    grass: {
        ...defaultMatchups(),
        fire: 0.5,
        water: 0.5,
        grass: 0.5,
        poison: 0.5,
        ground: 2,
        flying: 0.5,
        bug: 0.5,
        rock: 2,
        dragon: 0.5,
        steel: 0.5,
    },
    ice: {
        ...defaultMatchups(),
        fire: 0.5,
        water: 0.5,
        grass: 2,
        ice: 0.5,
        ground: 2,
        flying: 2,
        dragon: 2,
        steel: 0.5,
    },
    fighting: {
        ...defaultMatchups(),
        normal: 2,
        ice: 2,
        poison: 0.5,
        flying: 0.5,
        psychic: 0.5,
        bug: 0.5,
        rock: 2,
        ghost: 0,
        dark: 2,
        steel: 2,
        fairy: 0.5,
    },
    poison: { ...defaultMatchups(), grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
    ground: {
        ...defaultMatchups(),
        fire: 2,
        electric: 2,
        grass: 0.5,
        poison: 2,
        flying: 0,
        bug: 0.5,
        rock: 2,
        steel: 2,
    },
    flying: { ...defaultMatchups(), electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
    psychic: { ...defaultMatchups(), fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
    bug: {
        ...defaultMatchups(),
        fire: 0.5,
        grass: 2,
        fighting: 0.5,
        poison: 0.5,
        flying: 0.5,
        psychic: 2,
        ghost: 0.5,
        dark: 2,
        steel: 0.5,
        fairy: 0.5,
    },
    rock: { ...defaultMatchups(), fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
    ghost: { ...defaultMatchups(), normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
    dragon: { ...defaultMatchups(), dragon: 2, steel: 0.5, fairy: 0 },
    dark: { ...defaultMatchups(), fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
    steel: { ...defaultMatchups(), fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
    fairy: { ...defaultMatchups(), fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
};

/**
 * 세대에 따른 상성 테이블을 반환합니다.
 */
export function getTypeMatchupsForGen(gen: number | "champions"): Record<PokemonType, Record<PokemonType, number>> {
    // 깊은 복사
    const matchups: Record<PokemonType, Record<PokemonType, number>> = JSON.parse(JSON.stringify(TYPE_MATCHUPS));
    const g = gen === "champions" ? 9 : gen;

    // 6세대 미만: 페어리 타입 관련 상성 제거 및 수정
    if (g < 6) {
        const _typesToRemove: PokemonType[] = ["fairy"];

        // 페어리 타입 자체의 공격/방어 상성 제거 (사실상 안 쓰이게 됨)
        // 다른 타입이 페어리에게 주는 영향 수정 (모두 1배로)
        POKEMON_TYPES.forEach((atk) => {
            if (matchups[atk]) {
                matchups[atk].fairy = 1.0;
            }
        });

        // 강철 타입의 고스트, 악 내성 (0.5배) 존재하던 시절 (2~5세대)
        matchups.ghost.steel = 0.5;
        matchups.dark.steel = 0.5;
    }

    // 2세대 미만: 악, 강철 타입 관련 상성 제거 및 수정
    if (g < 2) {
        const _typesToRemove: PokemonType[] = ["dark", "steel"];

        POKEMON_TYPES.forEach((atk) => {
            if (matchups[atk]) {
                matchups[atk].dark = 1.0;
                matchups[atk].steel = 1.0;
            }
        });

        // 1세대 특수 상성
        // 고스트 -> 에스퍼 (0배, 원래 버그였으나 1세대 공식)
        matchups.ghost.psychic = 0;
        // 독 <-> 벌레 (서로 2배)
        matchups.poison.bug = 2;
        matchups.bug.poison = 2;
        // 얼음 -> 불꽃 (1배, 2세대부터 0.5배)
        matchups.ice.fire = 1;
    }

    return matchups;
}

/**
 * 세대에 존재하는 타입 목록만 반환합니다.
 */
export function getTypesForGenList(gen: number | "champions"): PokemonType[] {
    const g = gen === "champions" ? 9 : gen;
    if (g < 2) {
        return POKEMON_TYPES.filter((t) => !["dark", "steel", "fairy"].includes(t));
    }
    if (g < 6) {
        return POKEMON_TYPES.filter((t) => t !== "fairy");
    }
    return [...POKEMON_TYPES];
}

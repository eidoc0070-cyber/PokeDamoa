import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { disassembleHangul } from './utils/hangul.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_CSV_DIR = path.resolve(__dirname, '../public/pokeapi/pokeapi-master/data/v2/csv');
const DEFAULT_OUTPUT_FILE = path.resolve(__dirname, '../public/pokedex-data.json');
const DEFAULT_MOVES_OUTPUT_FILE = path.resolve(__dirname, '../public/moves-data.json');
const DEFAULT_ABILITIES_OUTPUT_FILE = path.resolve(__dirname, '../public/abilities-data.json');
const DEFAULT_ITEMS_OUTPUT_FILE = path.resolve(__dirname, '../public/items-data.json');

// 매우 단순한 CSV 파서 (현재 대상 파일들은 내부에 쉼표(,)가 없음을 전제)
function parseCSV(csvDir: string, filename: string) {
  const filePath = path.join(csvDir, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`파일을 찾을 수 없습니다: ${filePath}`);
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  // 따옴표 내의 쉼표를 처리하기 위한 복잡한 정규식 대신, 
  // 포켓몬 CSV 특성상 따옴표로 감싸진 필드가 있을 수 있으므로 처리 개선
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return [];

  const headers = lines[0].split(',');
  const results: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    // 쉼표로 분리하되 따옴표 내부의 쉼표는 무시하는 간단한 처리
    const row = lines[i];
    const cols: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let char of row) {
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) {
        cols.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    cols.push(current);

    const obj: any = {};
    headers.forEach((h, idx) => {
      obj[h] = cols[idx] !== undefined ? cols[idx] : '';
    });
    results.push(obj);
  }
  return results;
}

// 명칭 변환 보조 함수 (identifier -> 읽기 좋은 이름)
function formatIdentifier(id: string) {
    if (!id) return '';
    return id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export function processData(csvDir: string = DEFAULT_CSV_DIR, outputPokedex: string = DEFAULT_OUTPUT_FILE, outputMoves: string = DEFAULT_MOVES_OUTPUT_FILE) {
  try {
    console.log('CSV 파일 파싱 시작...');

    const pokemonList = parseCSV(csvDir, 'pokemon.csv');
    const speciesList = parseCSV(csvDir, 'pokemon_species.csv');
    const speciesNamesList = parseCSV(csvDir, 'pokemon_species_names.csv');
    const pokemonTypesList = parseCSV(csvDir, 'pokemon_types.csv');
    const typesList = parseCSV(csvDir, 'types.csv');
    const pokemonStatsList = parseCSV(csvDir, 'pokemon_stats.csv');
    
    const movesList = parseCSV(csvDir, 'moves.csv');
    const moveNamesList = parseCSV(csvDir, 'move_names.csv');
    const moveEffectProseList = parseCSV(csvDir, 'move_effect_prose.csv');

    const abilitiesList = parseCSV(csvDir, 'abilities.csv');
    const abilityNamesList = parseCSV(csvDir, 'ability_names.csv');
    const abilityProseList = parseCSV(csvDir, 'ability_prose.csv');

    const itemsList = parseCSV(csvDir, 'items.csv');
    const itemNamesList = parseCSV(csvDir, 'item_names.csv');
    const itemProseList = parseCSV(csvDir, 'item_prose.csv');
    
    // 출현 위치 정보를 위한 CSV 파싱
    const encountersList = parseCSV(csvDir, 'encounters.csv');
    const locationsList = parseCSV(csvDir, 'locations.csv');
    const locationNamesList = parseCSV(csvDir, 'location_names.csv');
    const locationAreasList = parseCSV(csvDir, 'location_areas.csv');
    const locationAreaProseList = parseCSV(csvDir, 'location_area_prose.csv');
    const versionsList = parseCSV(csvDir, 'versions.csv');
    const versionNamesList = parseCSV(csvDir, 'version_names.csv');
    const versionGroupsList = parseCSV(csvDir, 'version_groups.csv');

    console.log('데이터 매핑 중...');

    // 1. species_id -> generation_id, capture_rate 매핑
    const speciesDataMap = new Map<number, { genId: number, captureRate: number }>();
    speciesList.forEach(s => {
      speciesDataMap.set(parseInt(s.id), {
        genId: parseInt(s.generation_id),
        captureRate: parseInt(s.capture_rate) || 0
      });
    });

    // 2. species_id -> 한국어 이름 매핑 (local_language_id = 3)
    const speciesNameMap = new Map<number, string>();
    speciesNamesList.forEach(sn => {
      if (sn.local_language_id === '3') {
        speciesNameMap.set(parseInt(sn.pokemon_species_id), sn.name);
      }
    });

    // 3. type_id -> type identifier 매핑
    const typeIdMap = new Map<number, string>();
    typesList.forEach(t => {
      typeIdMap.set(parseInt(t.id), t.identifier);
    });

    // 4. pokemon_id -> types (순서 보장 위해 slot 참조)
    const pokemonToTypesMap = new Map<number, string[]>();
    pokemonTypesList.forEach(pt => {
      const pid = parseInt(pt.pokemon_id);
      const tid = parseInt(pt.type_id);
      const slot = parseInt(pt.slot);
      const tName = typeIdMap.get(tid);

      if (!pokemonToTypesMap.has(pid)) pokemonToTypesMap.set(pid, []);
      pokemonToTypesMap.get(pid)![slot - 1] = tName!;
    });

    // 5. pokemon_id -> stats
    const pokemonToStatsMap = new Map<number, any>();
    const statKeyMap: Record<number, string> = { 1: 'hp', 2: 'atk', 3: 'def', 4: 'spa', 5: 'spd', 6: 'spe' };
    pokemonStatsList.forEach(ps => {
      const pid = parseInt(ps.pokemon_id);
      const sid = parseInt(ps.stat_id);
      const val = parseInt(ps.base_stat);

      if (!pokemonToStatsMap.has(pid)) {
        pokemonToStatsMap.set(pid, { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
      }
      const statName = statKeyMap[sid];
      if (statName) {
        pokemonToStatsMap.get(pid)![statName] = val;
      }
    });

    // --- 출현 위치 정보 매핑 시작 ---
    
    // location_id -> { ko: string, en: string, identifier: string }
    const locationInfoMap = new Map<number, { ko: string, en: string, identifier: string }>();
    locationsList.forEach(l => {
        locationInfoMap.set(parseInt(l.id), { ko: '', en: '', identifier: l.identifier });
    });
    locationNamesList.forEach(ln => {
        const lid = parseInt(ln.location_id);
        const info = locationInfoMap.get(lid);
        if (info) {
            if (ln.local_language_id === '3') info.ko = ln.name;
            if (ln.local_language_id === '9') info.en = ln.name;
        }
    });

    // location_area_id -> { ko: string, en: string, identifier: string, locationId: number }
    const areaInfoMap = new Map<number, { ko: string, en: string, identifier: string, locationId: number }>();
    locationAreasList.forEach(la => {
        areaInfoMap.set(parseInt(la.id), { ko: '', en: '', identifier: la.identifier, locationId: parseInt(la.location_id) });
    });
    locationAreaProseList.forEach(lap => {
        const laid = parseInt(lap.location_area_id);
        const info = areaInfoMap.get(laid);
        if (info) {
            if (lap.local_language_id === '3') info.ko = lap.name;
            if (lap.local_language_id === '9') info.en = lap.name;
        }
    });

    // version_id -> { name: string, genId: number }
    const versionGroupMap = new Map<number, { genId: number }>();
    versionGroupsList.forEach(vg => {
      versionGroupMap.set(parseInt(vg.id), { genId: parseInt(vg.generation_id) });
    });

    const versionMap = new Map<number, { name: string, genId: number }>();
    const versionNameMap = new Map<number, { ko: string, en: string }>();
    versionNamesList.forEach(vn => {
        const vid = parseInt(vn.version_id);
        if (!versionNameMap.has(vid)) versionNameMap.set(vid, { ko: '', en: '' });
        if (vn.local_language_id === '3') versionNameMap.get(vid)!.ko = vn.name;
        if (vn.local_language_id === '9') versionNameMap.get(vid)!.en = vn.name;
    });

    versionsList.forEach(v => {
      const vid = parseInt(v.id);
      const vgid = parseInt(v.version_group_id);
      const vg = versionGroupMap.get(vgid);
      const names = versionNameMap.get(vid);
      const name = (names && names.ko) ? names.ko : ((names && names.en) ? names.en : formatIdentifier(v.identifier));
      versionMap.set(vid, { name, genId: vg ? vg.genId : 0 });
    });

    // pokemon_id -> encounters grouped by version and location
    // Map<pid, Map<vid, Map<lid, Set<areaName>>>>
    const pokemonEncountersRaw = new Map<number, Map<number, Map<number, Set<string>>>>();
    
    encountersList.forEach(e => {
      const pid = parseInt(e.pokemon_id);
      const vid = parseInt(e.version_id);
      const laid = parseInt(e.location_area_id);
      
      const areaInfo = areaInfoMap.get(laid);
      if (!areaInfo) return;
      
      const lid = areaInfo.locationId;
      const areaName = areaInfo.ko || areaInfo.en || formatIdentifier(areaInfo.identifier);

      if (!pokemonEncountersRaw.has(pid)) pokemonEncountersRaw.set(pid, new Map());
      const vMap = pokemonEncountersRaw.get(pid)!;
      
      if (!vMap.has(vid)) vMap.set(vid, new Map());
      const lMap = vMap.get(vid)!;
      
      if (!lMap.has(lid)) lMap.set(lid, new Set());
      lMap.get(lid)!.add(areaName);
    });

    // pokemon_id -> Array of { genId, versionName, locations: string[] }
    const pokemonEncountersMap = new Map<number, any[]>();
    pokemonEncountersRaw.forEach((vMap, pid) => {
      const encounters: any[] = [];
      vMap.forEach((lMap, vid) => {
        const vInfo = versionMap.get(vid);
        if (!vInfo) return;

        const locationStrings: string[] = [];
        lMap.forEach((aSet, lid) => {
            const lInfo = locationInfoMap.get(lid);
            if (!lInfo) return;
            const lName = lInfo.ko || lInfo.en || formatIdentifier(lInfo.identifier);
            
            // Area 이름이 Location 이름과 같거나 비어있으면 생략, 아니면 합침
            const areas = Array.from(aSet).filter(a => a && a !== lName && a !== formatIdentifier(lInfo.identifier));
            if (areas.length > 0) {
                locationStrings.push(`${lName} (${areas.join(', ')})`);
            } else {
                locationStrings.push(lName);
            }
        });

        encounters.push({
          genId: vInfo.genId,
          versionName: vInfo.name,
          locations: locationStrings
        });
      });
      // 정렬: 세대순, 버전이름순
      encounters.sort((a, b) => a.genId - b.genId || a.versionName.localeCompare(b.versionName));
      pokemonEncountersMap.set(pid, encounters);
    });

    // --- 출현 위치 정보 매핑 종료 ---

    console.log('JSON 조립 중...');

    const finalPokedex: any[] = [];

    pokemonList.forEach(p => {
      const id = parseInt(p.id);
      const speciesId = parseInt(p.species_id);
      const isDefault = parseInt(p.is_default) === 1;
      
      const sData = speciesDataMap.get(speciesId);
      const genId = sData ? sData.genId : 0;
      const captureRate = sData ? sData.captureRate : 0;

      const nameKo = speciesNameMap.get(speciesId) || p.identifier;
      const types = (pokemonToTypesMap.get(id) || []).filter(Boolean);
      const stats = pokemonToStatsMap.get(id) || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
      
      // 출현 위치 정보 추가
      const encounters = pokemonEncountersMap.get(id) || [];

      const { disassembled, initialConsonants } = disassembleHangul(nameKo);
      const searchKey = `${nameKo}|${p.identifier.toLowerCase()}|${disassembled}|${initialConsonants}`;

      finalPokedex.push({
        id,
        speciesId,
        nameKo,
        nameEn: p.identifier,
        searchKey,
        types,
        stats,
        genId,
        captureRate,
        isDefault,
        encounters
      });
    });

    fs.writeFileSync(outputPokedex, JSON.stringify(finalPokedex, null, 0), 'utf-8');
    console.log(`성공적으로 도감 데이터가 생성되었습니다! (총 ${finalPokedex.length} 마리) -> ${outputPokedex}`);

    console.log('기술(Moves) 데이터 조립 중...');
    
    const moveNameMap = new Map<number, string>();
    moveNamesList.forEach(mn => {
      if (mn.local_language_id === '3') {
        moveNameMap.set(parseInt(mn.move_id), mn.name);
      }
    });

    const moveEffectMap = new Map<number, string>();
    moveEffectProseList.forEach(mep => {
      if (mep.local_language_id === '3') {
        moveEffectMap.set(parseInt(mep.move_effect_id), mep.short_effect || mep.effect);
      }
    });

    const finalMoves: any[] = [];
    movesList.forEach(m => {
      const id = parseInt(m.id);
      const power = parseInt(m.power) || 0;
      const typeId = parseInt(m.type_id);
      const damageClassId = parseInt(m.damage_class_id); // 1=status, 2=physical, 3=special
      const effectId = parseInt(m.effect_id);
      
      const nameKo = moveNameMap.get(id) || m.identifier;
      const typeName = typeIdMap.get(typeId) || 'unknown';
      const effect = moveEffectMap.get(effectId) || '';
      
      let category = 'status';
      if (damageClassId === 2) category = 'physical';
      if (damageClassId === 3) category = 'special';

      const { disassembled, initialConsonants } = disassembleHangul(nameKo);
      const searchKey = `${nameKo}|${m.identifier.toLowerCase()}|${disassembled}|${initialConsonants}`;

      finalMoves.push({
        id,
        nameKo,
        nameEn: m.identifier,
        searchKey,
        power,
        type: typeName,
        category,
        effect
      });
    });

    fs.writeFileSync(outputMoves, JSON.stringify(finalMoves, null, 0), 'utf-8');
    console.log(`성공적으로 기술 데이터가 생성되었습니다! (총 ${finalMoves.length} 개) -> ${outputMoves}`);

    console.log('특성(Abilities) 데이터 조립 중...');
    
    const abilityNameMap = new Map<number, string>();
    abilityNamesList.forEach(an => {
      if (an.local_language_id === '3') {
        abilityNameMap.set(parseInt(an.ability_id), an.name);
      }
    });

    const abilityEffectMap = new Map<number, string>();
    abilityProseList.forEach(ap => {
      if (ap.local_language_id === '3') {
        abilityEffectMap.set(parseInt(ap.ability_id), ap.short_effect || ap.effect);
      }
    });

    const finalAbilities: any[] = [];
    abilitiesList.forEach(a => {
      const id = parseInt(a.id);
      if (id >= 10000) return; // 특수 용도 특성 제외

      const nameKo = abilityNameMap.get(id) || a.identifier;
      const effect = abilityEffectMap.get(id) || '';

      const { disassembled, initialConsonants } = disassembleHangul(nameKo);
      const searchKey = `${nameKo}|${a.identifier.toLowerCase()}|${disassembled}|${initialConsonants}`;

      finalAbilities.push({
        id,
        nameKo,
        nameEn: a.identifier,
        searchKey,
        effect
      });
    });

    fs.writeFileSync(DEFAULT_ABILITIES_OUTPUT_FILE, JSON.stringify(finalAbilities, null, 0), 'utf-8');
    console.log(`성공적으로 특성 데이터가 생성되었습니다! (총 ${finalAbilities.length} 개) -> ${DEFAULT_ABILITIES_OUTPUT_FILE}`);

    console.log('아이템(Items) 데이터 조립 중...');
    
    const itemNameMap = new Map<number, string>();
    itemNamesList.forEach(inm => {
      if (inm.local_language_id === '3') {
        itemNameMap.set(parseInt(inm.item_id), inm.name);
      }
    });

    const itemEffectMap = new Map<number, string>();
    itemProseList.forEach(ip => {
      if (ip.local_language_id === '3') {
        itemEffectMap.set(parseInt(ip.item_id), ip.short_effect || ip.effect);
      }
    });

    const finalItems: any[] = [];
    itemsList.forEach(item => {
      const id = parseInt(item.id);
      const nameKo = itemNameMap.get(id) || item.identifier;
      const effect = itemEffectMap.get(id) || '';

      const { disassembled, initialConsonants } = disassembleHangul(nameKo);
      const searchKey = `${nameKo}|${item.identifier.toLowerCase()}|${disassembled}|${initialConsonants}`;

      finalItems.push({
        id,
        nameKo,
        nameEn: item.identifier,
        searchKey,
        effect,
        category: parseInt(item.category_id)
      });
    });

    fs.writeFileSync(DEFAULT_ITEMS_OUTPUT_FILE, JSON.stringify(finalItems, null, 0), 'utf-8');
    console.log(`성공적으로 아이템 데이터가 생성되었습니다! (총 ${finalItems.length} 개) -> ${DEFAULT_ITEMS_OUTPUT_FILE}`);

  } catch (err) {
    console.error("데이터 생성 중 오류 발생:", err);
  }
}

// 스크립트로 직접 실행될 때만 호출
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  processData();
}

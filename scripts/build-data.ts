import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_DIR = path.resolve(__dirname, '../public/pokeapi/pokeapi-master/data/v2/csv');
const OUTPUT_FILE = path.resolve(__dirname, '../public/pokedex-data.json');
const MOVES_OUTPUT_FILE = path.resolve(__dirname, '../public/moves-data.json');

// 매우 단순한 CSV 파서 (현재 대상 파일들은 내부에 쉼표(,)가 없음을 전제)
function parseCSV(filename: string) {
  const filePath = path.join(CSV_DIR, filename);
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const headers = lines[0].split(',');
  const results: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const obj: any = {};
    headers.forEach((h, idx) => {
      obj[h] = cols[idx] !== undefined ? cols[idx] : '';
    });
    results.push(obj);
  }
  return results;
}

try {
  console.log('CSV 파일 파싱 시작...');

  const pokemonList = parseCSV('pokemon.csv');
  const speciesList = parseCSV('pokemon_species.csv');
  const speciesNamesList = parseCSV('pokemon_species_names.csv');
  const pokemonTypesList = parseCSV('pokemon_types.csv');
  const typesList = parseCSV('types.csv');
  const pokemonStatsList = parseCSV('pokemon_stats.csv');
  const movesList = parseCSV('moves.csv');
  const moveNamesList = parseCSV('move_names.csv');
  
  // 출현 위치 정보를 위한 CSV 파싱
  const encountersList = parseCSV('encounters.csv');
  const locationsList = parseCSV('locations.csv');
  const locationNamesList = parseCSV('location_names.csv');
  const versionsList = parseCSV('versions.csv');
  const versionNamesList = parseCSV('version_names.csv');
  const versionGroupsList = parseCSV('version_groups.csv');

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
  
  // location_id -> Korean Name
  const locationNameMap = new Map<number, string>();
  locationNamesList.forEach(ln => {
    if (ln.local_language_id === '3') {
      locationNameMap.set(parseInt(ln.location_id), ln.name);
    }
  });

  // location_area_id -> location_id
  const locationAreaToLocationMap = new Map<number, number>();
  const locationAreasList = parseCSV('location_areas.csv');
  locationAreasList.forEach(la => {
    locationAreaToLocationMap.set(parseInt(la.id), parseInt(la.location_id));
  });

  // version_id -> { name: string, genId: number }
  const versionGroupMap = new Map<number, { genId: number }>();
  versionGroupsList.forEach(vg => {
    versionGroupMap.set(parseInt(vg.id), { genId: parseInt(vg.generation_id) });
  });

  const versionMap = new Map<number, { name: string, genId: number }>();
  const versionNameMap = new Map<number, string>();
  versionNamesList.forEach(vn => {
    if (vn.local_language_id === '3') {
      versionNameMap.set(parseInt(vn.version_id), vn.name);
    }
  });

  versionsList.forEach(v => {
    const vid = parseInt(v.id);
    const vgid = parseInt(v.version_group_id);
    const vg = versionGroupMap.get(vgid);
    const name = versionNameMap.get(vid) || v.identifier;
    versionMap.set(vid, { name, genId: vg ? vg.genId : 0 });
  });

  // pokemon_id -> encounters grouped by version
  // { [versionId]: Set<locationName> }
  const pokemonEncountersRaw = new Map<number, Map<number, Set<string>>>();
  encountersList.forEach(e => {
    const pid = parseInt(e.pokemon_id);
    const vid = parseInt(e.version_id);
    const laid = parseInt(e.location_area_id);
    const lid = locationAreaToLocationMap.get(laid);
    if (!lid) return;
    const lName = locationNameMap.get(lid);
    if (!lName) return;

    if (!pokemonEncountersRaw.has(pid)) pokemonEncountersRaw.set(pid, new Map());
    const versionMap = pokemonEncountersRaw.get(pid)!;
    if (!versionMap.has(vid)) versionMap.set(vid, new Set());
    versionMap.get(vid)!.add(lName);
  });

  // pokemon_id -> Array of { genId, versionName, locations: string[] }
  const pokemonEncountersMap = new Map<number, any[]>();
  pokemonEncountersRaw.forEach((vMap, pid) => {
    const encounters: any[] = [];
    vMap.forEach((lSet, vid) => {
      const vInfo = versionMap.get(vid);
      if (vInfo) {
        encounters.push({
          genId: vInfo.genId,
          versionName: vInfo.name,
          locations: Array.from(lSet)
        });
      }
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

    finalPokedex.push({
      id,
      speciesId,
      nameKo,
      nameEn: p.identifier,
      types,
      stats,
      genId,
      captureRate,
      isDefault,
      encounters
    });
  });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalPokedex, null, 0), 'utf-8');
  console.log(`성공적으로 도감 데이터가 생성되었습니다! (총 ${finalPokedex.length} 마리) -> ${OUTPUT_FILE}`);

  console.log('기술(Moves) 데이터 조립 중...');
  
  const moveNameMap = new Map<number, string>();
  moveNamesList.forEach(mn => {
    if (mn.local_language_id === '3') {
      moveNameMap.set(parseInt(mn.move_id), mn.name);
    }
  });

  const finalMoves: any[] = [];
  movesList.forEach(m => {
    const id = parseInt(m.id);
    const power = parseInt(m.power) || 0;
    const typeId = parseInt(m.type_id);
    const damageClassId = parseInt(m.damage_class_id); // 1=status, 2=physical, 3=special
    
    // 공격기가 아닌 경우 (변화기)는 결정력 계산기에서 불필요하지만 혹시 모르니 남김 (power가 0인 것으로 구분 가능)
    const nameKo = moveNameMap.get(id) || m.identifier;
    const typeName = typeIdMap.get(typeId) || 'unknown';
    
    let category = 'status';
    if (damageClassId === 2) category = 'physical';
    if (damageClassId === 3) category = 'special';

    finalMoves.push({
      id,
      nameKo,
      nameEn: m.identifier,
      power,
      type: typeName,
      category
    });
  });

  fs.writeFileSync(MOVES_OUTPUT_FILE, JSON.stringify(finalMoves, null, 0), 'utf-8');
  console.log(`성공적으로 기술 데이터가 생성되었습니다! (총 ${finalMoves.length} 개) -> ${MOVES_OUTPUT_FILE}`);

} catch (err) {
  console.error("데이터 생성 중 오류 발생:", err);
}

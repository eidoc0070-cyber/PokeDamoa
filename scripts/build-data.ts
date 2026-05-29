import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { disassembleHangul } from './utils/hangul.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_CSV_DIR = path.resolve(__dirname, '../data-source/pokeapi/pokeapi-master/data/v2/csv');
const DEFAULT_OUTPUT_FILE = path.resolve(__dirname, '../public/pokedex-data.json');
const DEFAULT_MOVES_OUTPUT_FILE = path.resolve(__dirname, '../public/moves-data.json');
const DEFAULT_ABILITIES_OUTPUT_FILE = path.resolve(__dirname, '../public/abilities-data.json');
const DEFAULT_ITEMS_OUTPUT_FILE = path.resolve(__dirname, '../public/items-data.json');

function parseCSV(csvDir: string, filename: string) {
  const filePath = path.join(csvDir, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`파일을 찾을 수 없습니다: ${filePath}`);
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return [];

  const headers = lines[0]!.split(',');
  const results: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i]!;
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
    const pokemonAbilitiesList = parseCSV(csvDir, 'pokemon_abilities.csv');
    
    const pokemonStatsPastList = parseCSV(csvDir, 'pokemon_stats_past.csv');
    const pokemonTypesPastList = parseCSV(csvDir, 'pokemon_types_past.csv');
    const pokemonAbilitiesPastList = parseCSV(csvDir, 'pokemon_abilities_past.csv');
    
    const movesList = parseCSV(csvDir, 'moves.csv');
    const moveNamesList = parseCSV(csvDir, 'move_names.csv');
    const moveEffectProseList = parseCSV(csvDir, 'move_effect_prose.csv');
    const moveChangelogList = parseCSV(csvDir, 'move_changelog.csv');

    const abilitiesList = parseCSV(csvDir, 'abilities.csv');
    const abilityNamesList = parseCSV(csvDir, 'ability_names.csv');
    const abilityProseList = parseCSV(csvDir, 'ability_prose.csv');

    const itemsList = parseCSV(csvDir, 'items.csv');
    const itemNamesList = parseCSV(csvDir, 'item_names.csv');
    const itemProseList = parseCSV(csvDir, 'item_prose.csv');
    
    const encountersList = parseCSV(csvDir, 'encounters.csv');
    const locationsList = parseCSV(csvDir, 'locations.csv');
    const locationNamesList = parseCSV(csvDir, 'location_names.csv');
    const locationAreasList = parseCSV(csvDir, 'location_areas.csv');
    const locationAreaProseList = parseCSV(csvDir, 'location_area_prose.csv');
    const versionsList = parseCSV(csvDir, 'versions.csv');
    const versionNamesList = parseCSV(csvDir, 'version_names.csv');
    const versionGroupsList = parseCSV(csvDir, 'version_groups.csv');
    const dexNumbersList = parseCSV(csvDir, 'pokemon_dex_numbers.csv');

    console.log('기술 습득 정보(pokemon_moves.csv) 로딩 중...');
    const pokemonMovesRaw = parseCSV(csvDir, 'pokemon_moves.csv');

    console.log('데이터 매핑 중...');

    const nationalDexMap = new Map<number, number>();
    dexNumbersList.forEach(dn => {
      if (dn.pokedex_id === '1') {
        nationalDexMap.set(parseInt(dn.species_id), parseInt(dn.pokedex_number));
      }
    });

    const versionGroupToGenMap = new Map<number, number>();
    versionGroupsList.forEach(vg => {
      versionGroupToGenMap.set(parseInt(vg.id), parseInt(vg.generation_id));
    });

    const speciesDataMap = new Map<number, { genId: number, captureRate: number }>();
    speciesList.forEach(s => {
      speciesDataMap.set(parseInt(s.id), {
        genId: parseInt(s.generation_id),
        captureRate: parseInt(s.capture_rate) || 0
      });
    });

    const speciesNameMap = new Map<number, string>();
    speciesNamesList.forEach(sn => {
      if (sn.local_language_id === '3') {
        speciesNameMap.set(parseInt(sn.pokemon_species_id), sn.name);
      }
    });

    const typeIdMap = new Map<number, string>();
    typesList.forEach(t => {
      typeIdMap.set(parseInt(t.id), t.identifier);
    });

    const pokemonToTypesMap = new Map<number, string[]>();
    pokemonTypesList.forEach(pt => {
      const pid = parseInt(pt.pokemon_id);
      const tid = parseInt(pt.type_id);
      const slot = parseInt(pt.slot);
      if (!pokemonToTypesMap.has(pid)) pokemonToTypesMap.set(pid, []);
      pokemonToTypesMap.get(pid)![slot - 1] = typeIdMap.get(tid)!;
    });

    const pokemonToTypesPastMap = new Map<number, any[]>();
    pokemonTypesPastList.forEach(ptp => {
        const pid = parseInt(ptp.pokemon_id);
        const genId = parseInt(ptp.generation_id);
        const tid = parseInt(ptp.type_id);
        const slot = parseInt(ptp.slot);
        if (!pokemonToTypesPastMap.has(pid)) pokemonToTypesPastMap.set(pid, []);
        let entry = pokemonToTypesPastMap.get(pid)!.find(e => e.genId === genId);
        if (!entry) {
            entry = { genId, types: [] };
            pokemonToTypesPastMap.get(pid)!.push(entry);
        }
        entry.types[slot - 1] = typeIdMap.get(tid)!;
    });

    const statKeyMap: Record<number, string> = { 1: 'hp', 2: 'atk', 3: 'def', 4: 'spa', 5: 'spd', 6: 'spe', 9: 'special' };
    const getStatsObj = () => ({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } as any);

    const pokemonToStatsMap = new Map<number, any>();
    pokemonStatsList.forEach(ps => {
      const pid = parseInt(ps.pokemon_id);
      const sid = parseInt(ps.stat_id);
      if (!pokemonToStatsMap.has(pid)) pokemonToStatsMap.set(pid, getStatsObj());
      const key = statKeyMap[sid];
      if (key && key !== 'special') pokemonToStatsMap.get(pid)![key] = parseInt(ps.base_stat);
    });

    const pokemonToStatsPastMap = new Map<number, any[]>();
    pokemonStatsPastList.forEach(psp => {
        const pid = parseInt(psp.pokemon_id);
        const genId = parseInt(psp.generation_id);
        const sid = parseInt(psp.stat_id);
        const val = parseInt(psp.base_stat);
        if (!pokemonToStatsPastMap.has(pid)) pokemonToStatsPastMap.set(pid, []);
        let entry = pokemonToStatsPastMap.get(pid)!.find(e => e.genId === genId);
        if (!entry) {
            entry = { genId, stats: getStatsObj() };
            pokemonToStatsPastMap.get(pid)!.push(entry);
        }
        const key = statKeyMap[sid];
        if (key === 'special') entry.stats['special'] = val;
        else if (key) entry.stats[key] = val;
    });

    const pokemonToAbilitiesMap = new Map<number, {id: number, isHidden: boolean}[]>();
    pokemonAbilitiesList.forEach(pa => {
        const pid = parseInt(pa.pokemon_id);
        if (!pokemonToAbilitiesMap.has(pid)) pokemonToAbilitiesMap.set(pid, []);
        pokemonToAbilitiesMap.get(pid)!.push({ id: parseInt(pa.ability_id), isHidden: pa.is_hidden === '1' });
    });

    const pokemonToAbilitiesPastMap = new Map<number, any[]>();
    pokemonAbilitiesPastList.forEach(pap => {
        const pid = parseInt(pap.pokemon_id);
        const genId = parseInt(pap.generation_id);
        if (!pokemonToAbilitiesPastMap.has(pid)) pokemonToAbilitiesPastMap.set(pid, []);
        let entry = pokemonToAbilitiesPastMap.get(pid)!.find(e => e.genId === genId);
        if (!entry) {
            entry = { genId, abilities: [] };
            pokemonToAbilitiesPastMap.get(pid)!.push(entry);
        }
        entry.abilities.push({ id: parseInt(pap.ability_id), isHidden: pap.is_hidden === '1' });
    });

    const pokemonLearnsetMap = new Map<number, Record<number, number[]>>();
    pokemonMovesRaw.forEach(pm => {
        const pid = parseInt(pm.pokemon_id);
        const vgid = parseInt(pm.version_group_id);
        const mid = parseInt(pm.move_id);
        const genId = versionGroupToGenMap.get(vgid);
        if (!genId) return;
        if (!pokemonLearnsetMap.has(pid)) pokemonLearnsetMap.set(pid, {});
        if (!pokemonLearnsetMap.get(pid)![genId]) pokemonLearnsetMap.get(pid)![genId] = [];
        const list = pokemonLearnsetMap.get(pid)![genId]!;
        if (!list.includes(mid)) list.push(mid);
    });

    // 출현 위치 매핑
    const locationInfoMap = new Map<number, { ko: string, en: string, identifier: string }>();
    locationsList.forEach(l => { locationInfoMap.set(parseInt(l.id), { ko: '', en: '', identifier: l.identifier }); });
    locationNamesList.forEach(ln => {
        const info = locationInfoMap.get(parseInt(ln.location_id));
        if (info) {
            if (ln.local_language_id === '3') info.ko = ln.name;
            if (ln.local_language_id === '9') info.en = ln.name;
        }
    });

    const areaInfoMap = new Map<number, { ko: string, en: string, identifier: string, locationId: number }>();
    locationAreasList.forEach(la => { areaInfoMap.set(parseInt(la.id), { ko: '', en: '', identifier: la.identifier, locationId: parseInt(la.location_id) }); });
    locationAreaProseList.forEach(lap => {
        const info = areaInfoMap.get(parseInt(lap.location_area_id));
        if (info) {
            if (lap.local_language_id === '3') info.ko = lap.name;
            if (lap.local_language_id === '9') info.en = lap.name;
        }
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
      const vg = versionGroupsList.find(g => parseInt(g.id) === vgid);
      const names = versionNameMap.get(vid);
      const name = names?.ko || names?.en || formatIdentifier(v.identifier);
      versionMap.set(vid, { name, genId: vg ? parseInt(vg.generation_id) : 0 });
    });

    const pokemonEncountersRawMap = new Map<number, Map<number, Map<number, Set<string>>>>();
    encountersList.forEach(e => {
      const pid = parseInt(e.pokemon_id);
      const vid = parseInt(e.version_id);
      const area = areaInfoMap.get(parseInt(e.location_area_id));
      if (!area) return;
      if (!pokemonEncountersRawMap.has(pid)) pokemonEncountersRawMap.set(pid, new Map());
      const vMap = pokemonEncountersRawMap.get(pid)!;
      if (!vMap.has(vid)) vMap.set(vid, new Map());
      const lMap = vMap.get(vid)!;
      if (!lMap.has(area.locationId)) lMap.set(area.locationId, new Set());
      lMap.get(area.locationId)!.add(area.ko || area.en || formatIdentifier(area.identifier));
    });

    const pokemonEncountersMap = new Map<number, any[]>();
    pokemonEncountersRawMap.forEach((vMap, pid) => {
      const encounters: any[] = [];
      vMap.forEach((lMap, vid) => {
        const vInfo = versionMap.get(vid);
        if (!vInfo) return;
        const locations: string[] = [];
        lMap.forEach((aSet, lid) => {
            const lInfo = locationInfoMap.get(lid);
            const lName = lInfo?.ko || lInfo?.en || formatIdentifier(lInfo?.identifier || '');
            const areas = Array.from(aSet).filter(a => a && a !== lName);
            locations.push(areas.length > 0 ? `${lName} (${areas.join(', ')})` : lName);
        });
        encounters.push({ genId: vInfo.genId, versionName: vInfo.name, locations });
      });
      encounters.sort((a, b) => a.genId - b.genId || a.versionName.localeCompare(b.versionName));
      pokemonEncountersMap.set(pid, encounters);
    });

    console.log('JSON 조립 중...');
    const finalPokedex: any[] = [];
    pokemonList.forEach(p => {
      const id = parseInt(p.id);
      const sId = parseInt(p.species_id);
      const sData = speciesDataMap.get(sId);
      const dexNumber = nationalDexMap.get(sId) || 0;
      const nameKo = speciesNameMap.get(sId) || p.identifier;
      const { disassembled, initialConsonants } = disassembleHangul(nameKo);
      finalPokedex.push({
        id, speciesId: sId, dexNumber, nameKo, nameEn: p.identifier,
        searchKey: `${nameKo}|${p.identifier.toLowerCase()}|${disassembled}|${initialConsonants}|${dexNumber}`,
        d: disassembled,
        c: initialConsonants,
        types: (pokemonToTypesMap.get(id) || []).filter(Boolean),
        typesPast: pokemonToTypesPastMap.get(id) || [],
        stats: pokemonToStatsMap.get(id) || getStatsObj(),
        statsPast: pokemonToStatsPastMap.get(id) || [],
        abilities: pokemonToAbilitiesMap.get(id) || [],
        abilitiesPast: pokemonToAbilitiesPastMap.get(id) || [],
        genId: sData?.genId || 0,
        captureRate: sData?.captureRate || 0,
        isDefault: p.is_default === '1',
        encounters: pokemonEncountersMap.get(id) || [],
        learnsets: pokemonLearnsetMap.get(id) || {}
      });
    });
    fs.writeFileSync(outputPokedex, JSON.stringify(finalPokedex, null, 0), 'utf-8');

    const moveChangelogMap = new Map<number, any[]>();
    moveChangelogList.forEach(mc => {
        const mid = parseInt(mc.move_id);
        const vgid = parseInt(mc.changed_in_version_group_id);
        const genId = versionGroupToGenMap.get(vgid);
        if (!genId) return;
        if (!moveChangelogMap.has(mid)) moveChangelogMap.set(mid, []);
        moveChangelogMap.get(mid)!.push({
            genId,
            power: mc.power ? parseInt(mc.power) : null,
            pp: mc.pp ? parseInt(mc.pp) : null,
            accuracy: mc.accuracy ? parseInt(mc.accuracy) : null,
            type: mc.type_id ? typeIdMap.get(parseInt(mc.type_id)) : null
        });
    });

    const moveNameMap = new Map<number, string>();
    moveNamesList.forEach(mn => { if (mn.local_language_id === '3') moveNameMap.set(parseInt(mn.move_id), mn.name); });
    const moveEffectMap = new Map<number, string>();
    moveEffectProseList.forEach(mep => { if (mep.local_language_id === '3') moveEffectMap.set(parseInt(mep.move_effect_id), mep.short_effect || mep.effect); });

    const finalMoves: any[] = [];
    movesList.forEach(m => {
      const id = parseInt(m.id);
      const nameKo = moveNameMap.get(id) || m.identifier;
      const { disassembled, initialConsonants } = disassembleHangul(nameKo);
      finalMoves.push({
        id, nameKo, nameEn: m.identifier, 
        searchKey: `${nameKo}|${m.identifier.toLowerCase()}|${disassembled}|${initialConsonants}`,
        d: disassembled,
        c: initialConsonants,
        power: parseInt(m.power) || 0, pp: parseInt(m.pp) || 0, accuracy: parseInt(m.accuracy) || 0,
        type: typeIdMap.get(parseInt(m.type_id)) || 'unknown',
        category: parseInt(m.damage_class_id) === 2 ? 'physical' : parseInt(m.damage_class_id) === 3 ? 'special' : 'status',
        effect: moveEffectMap.get(parseInt(m.effect_id)) || '',
        changelog: moveChangelogMap.get(id) || []
      });
    });
    fs.writeFileSync(outputMoves, JSON.stringify(finalMoves, null, 0), 'utf-8');

    const abilityNameMap = new Map<number, string>();
    abilityNamesList.forEach(an => { if (an.local_language_id === '3') abilityNameMap.set(parseInt(an.ability_id), an.name); });
    const abilityEffectMap = new Map<number, string>();
    abilityProseList.forEach(ap => { if (ap.local_language_id === '3') abilityEffectMap.set(parseInt(ap.ability_id), ap.short_effect || ap.effect); });
    const finalAbilities: any[] = [];
    abilitiesList.forEach(a => {
      const id = parseInt(a.id);
      if (id >= 10000) return;
      const nameKo = abilityNameMap.get(id) || a.identifier;
      const { disassembled, initialConsonants } = disassembleHangul(nameKo);
      finalAbilities.push({ 
        id, nameKo, nameEn: a.identifier, 
        searchKey: `${nameKo}|${a.identifier.toLowerCase()}|${disassembled}|${initialConsonants}`,
        d: disassembled,
        c: initialConsonants,
        effect: abilityEffectMap.get(id) || '' 
      });
    });
    fs.writeFileSync(DEFAULT_ABILITIES_OUTPUT_FILE, JSON.stringify(finalAbilities, null, 0), 'utf-8');

    const itemNameMap = new Map<number, string>();
    itemNamesList.forEach(inm => { if (inm.local_language_id === '3') itemNameMap.set(parseInt(inm.item_id), inm.name); });
    const itemEffectMap = new Map<number, string>();
    itemProseList.forEach(ip => { if (ip.local_language_id === '3') itemEffectMap.set(parseInt(ip.item_id), ip.short_effect || ip.effect); });
    const finalItems: any[] = [];
    itemsList.forEach(item => {
      const id = parseInt(item.id);
      const nameKo = itemNameMap.get(id) || item.identifier;
      const { disassembled, initialConsonants } = disassembleHangul(nameKo);
      finalItems.push({ 
        id, nameKo, nameEn: item.identifier, 
        searchKey: `${nameKo}|${item.identifier.toLowerCase()}|${disassembled}|${initialConsonants}`,
        d: disassembled,
        c: initialConsonants,
        effect: itemEffectMap.get(id) || '', 
        category: parseInt(item.category_id) 
      });
    });
    fs.writeFileSync(DEFAULT_ITEMS_OUTPUT_FILE, JSON.stringify(finalItems, null, 0), 'utf-8');

    // 버전 파일 생성 (타임스탬프 기반)
    const versionFile = path.resolve(__dirname, '../public/version.json');
    fs.writeFileSync(versionFile, JSON.stringify({ version: Date.now() }), 'utf-8');

    console.log('모든 데이터 빌드가 완료되었습니다.');
  } catch (err) {
    console.error("데이터 생성 중 오류 발생:", err);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  processData();
}

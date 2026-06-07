import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { EffectTag, EventHook, EffectAction, TargetType } from '../src/features/battle-ai/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_DIR = path.resolve(__dirname, '../data-source/pokeapi/pokeapi-master/data/v2/csv');
const ABILITIES_PATH = path.resolve(__dirname, '../public/abilities-data.json');
const MOVES_PATH = path.resolve(__dirname, '../public/moves-data.json');
const ITEMS_PATH = path.resolve(__dirname, '../public/items-data.json');

function parseCSV(filename: string) {
    const filePath = path.join(CSV_DIR, filename);
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0 || !lines[0]) return [];
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
        const cols = line.split(',');
        const obj: any = {};
        headers.forEach((h, idx) => { obj[h] = cols[idx]; });
        return obj;
    });
}

const STAT_ID_MAP: Record<string, string> = { '1': 'hp', '2': 'atk', '3': 'def', '4': 'spa', '5': 'spd', '6': 'spe', '7': 'accuracy', '8': 'evasion' };
const STATUS_ID_MAP: Record<string, string> = { '1': 'par', '2': 'slp', '3': 'frz', '4': 'brn', '5': 'psn' };

/**
 * CSV 기반으로 기술 태그 생성
 */
function generateMoveTagsFromCSV() {
    const moveMeta = parseCSV('move_meta.csv');
    const moveStatChanges = parseCSV('move_meta_stat_changes.csv');
    
    const moveTagsMap = new Map<number, EffectTag[]>();

    // 랭크 변화 처리
    moveStatChanges.forEach(sc => {
        const mid = parseInt(sc.move_id);
        const stat = STAT_ID_MAP[sc.stat_id];
        if (!stat) return;
        if (!moveTagsMap.has(mid)) moveTagsMap.set(mid, []);
        moveTagsMap.get(mid)!.push({
            id: `csv_move_rank_${mid}_${sc.stat_id}`,
            trigger: 'onAfterMove',
            action: 'modify_rank',
            params: { stat, stage: parseInt(sc.change) },
            target: parseInt(sc.change) < 0 ? 'opponent' : 'self',
            priority: 0,
            sourceType: 'move'
        });
    });

    // 메타 정보 처리 (상태이상, 흡수, 회복)
    moveMeta.forEach(m => {
        const mid = parseInt(m.move_id);
        if (!moveTagsMap.has(mid)) moveTagsMap.set(mid, []);
        const tags = moveTagsMap.get(mid)!;

        if (parseInt(m.meta_ailment_id) > 0) {
            const status = STATUS_ID_MAP[m.meta_ailment_id];
            if (status) {
                tags.push({
                    id: `csv_move_status_${mid}`,
                    trigger: 'onAfterMove',
                    action: 'apply_status',
                    params: { status, chance: parseInt(m.ailment_chance) || 100 },
                    target: 'opponent',
                    priority: 0,
                    sourceType: 'move'
                });
            }
        }
        if (parseInt(m.drain) !== 0) {
            tags.push({
                id: `csv_move_drain_${mid}`,
                trigger: 'onAfterMove',
                action: 'custom',
                params: { type: 'drain', percent: parseInt(m.drain) },
                target: 'self',
                priority: 0,
                sourceType: 'move'
            });
        }
        if (parseInt(m.healing) !== 0) {
            tags.push({
                id: `csv_move_heal_${mid}`,
                trigger: 'onAfterMove',
                action: 'heal',
                params: { percent: parseInt(m.healing) },
                target: 'self',
                priority: 0,
                sourceType: 'move'
            });
        }
    });

    return moveTagsMap;
}

// 기존 텍스트 기반 패턴 (특성/아이템용으로 유지)
const PATTERNS = {
    triggers: [
        { regex: /등장했을 때|나왔을 때|배틀에 나오면|배틀에 나갔을 때/, hook: 'onEntry' as EventHook },
        { regex: /턴이 끝날 때|차례가 끝날 때|매 턴/, hook: 'onTurnEnd' as EventHook },
        { regex: /공격할 때|기술을 썼을 때|기술을 사용했을 때/, hook: 'onBeforeMove' as EventHook },
        { regex: /데미지를 받았을 때|공격받았을 때|공격을 받으면/, hook: 'onDamageCalc' as EventHook },
        { regex: /쓰러졌을 때|기절했을 때/, hook: 'onFaint' as EventHook },
    ],
    actions: [
        { regex: /공격이 (올라간다|상승한다|올린다|크게 올라간다|크게 상승한다|올릴 때가 있다)/, action: 'modify_rank' as EffectAction, params: { stat: 'atk', stage: 1 } },
        { regex: /공격이 (떨어진다|하락한다|깎는다|떨어뜨린다|크게 떨어진다|떨어뜨릴 때가 있다)/, action: 'modify_rank' as EffectAction, params: { stat: 'atk', stage: -1 } },
        { regex: /방어가 (올라간다|상승한다|올린다|크게 올라간다|올릴 때가 있다)/, action: 'modify_rank' as EffectAction, params: { stat: 'def', stage: 1 } },
        { regex: /방어가 (떨어진다|하락한다|깎는다|떨어뜨린다|떨어뜨릴 때가 있다)/, action: 'modify_rank' as EffectAction, params: { stat: 'def', stage: -1 } },
        { regex: /스피드가 (올라간다|상승한다|올린다|올릴 때가 있다)/, action: 'modify_rank' as EffectAction, params: { stat: 'spe', stage: 1 } },
        { regex: /스피드가 (떨어진다|하락한다|깎는다|떨어뜨린다|떨어뜨릴 때가 있다)/, action: 'modify_rank' as EffectAction, params: { stat: 'spe', stage: -1 } },
        { regex: /HP를 (회복한다|회복시킨다)/, action: 'heal' as EffectAction, params: { percent: 12.5 } },
    ],
    targets: [
        { regex: /상대의|상대방의|상대 포켓몬의/, target: 'opponent' as TargetType },
        { regex: /자신의|자신은|자신 포켓몬의/, target: 'self' as TargetType },
    ]
};

function generateTagsFromText(text: string, sourceType: 'ability' | 'item' | 'move', id: number): EffectTag[] {
    const tags: EffectTag[] = [];
    if (!text) return tags;
    const cleanText = text.replace(/\n/g, ' ').replace(/\f/g, ' ').trim();
    const sentences = cleanText.split(/[.!\?]/);
    sentences.forEach((sentence, idx) => {
        let foundTrigger = PATTERNS.triggers.find(p => p.regex.test(sentence));
        let foundAction = PATTERNS.actions.find(p => p.regex.test(sentence));
        let foundTarget = PATTERNS.targets.find(p => p.regex.test(sentence));
        if (foundAction) {
            let stage = foundAction.params?.stage || 0;
            if (/크게 (올라간다|상승한다)/.test(sentence)) stage = 2;
            if (/크게 (떨어진다|하락한다)/.test(sentence)) stage = -2;
            let params = { ...foundAction.params };
            if (foundAction.action === 'modify_rank') params.stage = stage;
            tags.push({
                id: `auto_${sourceType}_${id}_${idx}`,
                trigger: foundTrigger?.hook || 'onTurnEnd',
                action: foundAction.action,
                params: params,
                target: foundTarget?.target || (foundAction.action === 'modify_rank' && /상대/.test(sentence) ? 'opponent' : 'self'),
                priority: 0,
                sourceType
            });
        }
    });
    return tags;
}

function processMoves() {
    console.log('기술 데이터 CSV 태깅 시작...');
    const moveTagsMap = generateMoveTagsFromCSV();
    const data = JSON.parse(fs.readFileSync(MOVES_PATH, 'utf-8'));
    let count = 0;
    const updatedData = data.map((item: any) => {
        const csvTags = moveTagsMap.get(item.id) || [];
        const textTags = generateTagsFromText(item.flavorText || item.effect || '', 'move', item.id);
        const manualTags = (item.effectTags || []).filter((tag: any) => tag && tag.id && !tag.id.startsWith('auto_') && !tag.id.startsWith('csv_'));
        
        // CSV 태그를 우선하고, 텍스트 태그는 중복되지 않을 때만 추가하거나 보조적으로 사용
        const combinedTags = [...manualTags, ...csvTags];
        if (csvTags.length === 0 && textTags.length > 0) combinedTags.push(...textTags);
        
        if (combinedTags.length > (manualTags.length || 0)) count++;
        item.effectTags = combinedTags;
        return item;
    });
    fs.writeFileSync(MOVES_PATH, JSON.stringify(updatedData, null, 0), 'utf-8');
    console.log(`${count}개의 기술에 태그가 추가되었습니다.`);
}

function processOther(filePath: string, sourceType: 'ability' | 'item') {
    console.log(`${sourceType} 데이터 텍스트 태깅 시작...`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    let count = 0;
    const updatedData = data.map((item: any) => {
        const manualTags = (item.effectTags || []).filter((tag: any) => tag && tag.id && !tag.id.startsWith('auto_'));
        const newTags = generateTagsFromText(item.flavorText || item.effect || '', sourceType, item.id);
        if (newTags.length > 0) {
            item.effectTags = [...manualTags, ...newTags];
            count++;
        }
        return item;
    });
    fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 0), 'utf-8');
    console.log(`${count}개의 ${sourceType} 항목에 태그가 추가되었습니다.`);
}

async function run() {
    processMoves();
    processOther(ABILITIES_PATH, 'ability');
    processOther(ITEMS_PATH, 'item');
    console.log('모든 자동 태깅 완료!');
}

run();

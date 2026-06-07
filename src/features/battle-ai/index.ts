import { fetchPokedexData, fetchMovesData, fetchStatusData } from '../../data/pokeapi.js';
import type { PokemonData, MoveData } from '../../data/pokeapi.js';
import { loadParties } from '../../state/storage.js';
import type { Party, PokemonSlot } from '../party-builder/types.js';
import { openPartySelectorModal } from '../party-builder/sub-components/PartySelectorModal.js';
import { calculateStat } from '../../utils/pokemon-math.js';
import { NATURES } from '../../data/constants.js';
import type { BattleState, BattlePokemon, BattleSide, AILevel, BattleAction } from './types.js';
import { executeTurn, executeEffects } from './engine.js';
import { getAiAction } from './ai.js';

export async function renderBattleAi(container: HTMLElement): Promise<() => void> {
    container.innerHTML = `<div style="text-align:center; padding: 40px;"><p>배틀 시뮬레이터 로드 중...</p></div>`;

    try {
        const [fullPokes, fullMoves, statusData] = await Promise.all([
            fetchPokedexData(), 
            fetchMovesData(),
            fetchStatusData()
        ]);
        
        if (fullPokes.length === 0 || fullMoves.length === 0) {
            throw new Error('포켓몬 또는 기술 데이터를 불러오지 못했습니다. 새로고침을 시도해보세요.');
        }

        const savedParties = loadParties();

        let playerParty: Party | null = savedParties.length > 0 ? savedParties[0] : null;
        let opponentParties: Party[] = savedParties.length > 0 ? [savedParties[0]] : [];
        let aiLevel: AILevel = 'beginner';
        let selectionStrategy: 'random' | 'order' | 'expert' = 'order';

        let battleState: BattleState | null = null;

        const initBattlePoke = (slot: PokemonSlot): BattlePokemon => {
            const data = fullPokes.find(p => p.id === slot.pokemonId);
            if (!data) {
                throw new Error(`Pokemon data not found for ID: ${slot.pokemonId}`);
            }
            const nature = NATURES.find(n => n.id === slot.natureId);
            const getMod = (key: any) => {
                if (nature?.plus === key) return 1.1;
                if (nature?.minus === key) return 0.9;
                return 1.0;
            };

            const stats = {
                hp: calculateStat(data.stats.hp, slot.ivs.hp, slot.evs.hp, slot.level, true),
                atk: calculateStat(data.stats.atk, slot.ivs.atk, slot.evs.atk, slot.level, false, getMod('atk')),
                def: calculateStat(data.stats.def, slot.ivs.def, slot.evs.def, slot.level, false, getMod('def')),
                spa: calculateStat(data.stats.spa, slot.ivs.spa, slot.evs.spa, slot.level, false, getMod('spa')),
                spd: calculateStat(data.stats.spd, slot.ivs.spd, slot.evs.spd, slot.level, false, getMod('spd')),
                spe: calculateStat(data.stats.spe, slot.ivs.spe, slot.evs.spe, slot.level, false, getMod('spe')),
            };

            const moves = slot.moveIds.map(id => fullMoves.find(m => m.id === id)).filter(Boolean) as MoveData[];

            return {
                ...slot,
                data,
                currentHp: stats.hp,
                maxHp: stats.hp,
                calculatedStats: stats,
                ranks: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0 },
                moves,
                isFainted: false,
                effectTags: [],
                abilityId: slot.abilityId ?? null,
                itemId: slot.itemId ?? null
            };
        };

        const startBattle = () => {
            try {
                if (!playerParty || opponentParties.length === 0) {
                    alert('자신의 파티와 상대 파티를 선택해주세요.');
                    return;
                }

                // 상대 파티 선택
                const randomOpponentParty = opponentParties[Math.floor(Math.random() * opponentParties.length)];
                if (!randomOpponentParty) return;
                
                // AI 선출 결정 (내부적으로 3마리 미리 결정)
                let opponentTeamSlots: PokemonSlot[] = [];
                if (selectionStrategy === 'order') {
                    opponentTeamSlots = randomOpponentParty.members.slice(0, 3);
                } else {
                    const shuffled = [...randomOpponentParty.members].sort(() => 0.5 - Math.random());
                    opponentTeamSlots = shuffled.slice(0, 3);
                }

                const opponentBattleTeam = opponentTeamSlots.map(initBattlePoke);
                
                // 선출 화면으로 전환 (상대 전체 파티 정보 전달)
                renderSelectionPhase(randomOpponentParty, opponentBattleTeam, statusData);
            } catch (err) {
                console.error('배틀 시작 오류:', err);
                alert(`배틀을 시작할 수 없습니다: ${err instanceof Error ? err.message : err}`);
            }
        };

        const renderSelectionPhase = (opponentFullParty: Party, opponentBattleTeam: BattlePokemon[], statusData: any) => {
            if (!playerParty) return;

            let selectedIndices: number[] = [];

            const updateSelectionUI = () => {
                container.innerHTML = `
                    <div style="display:flex; flex-direction:column; gap:16px;">
                        <div style="text-align:center;">
                            <h2 style="margin:0; font-size:1.3rem;">⚔️ 포켓몬 선출 (3마리 선택)</h2>
                            <p style="color:#666; font-size:0.9rem; margin-top:4px;">상대의 전체 엔트리를 보고 내 보낼 포켓몬을 순서대로 선택하세요.</p>
                        </div>

                        <!-- 상대 전체 엔트리 공개 (6마리) -->
                        <div class="card" style="background:rgba(244, 67, 54, 0.05); border:1px solid rgba(244, 67, 54, 0.2);">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                                <label style="font-weight:bold; color:#d32f2f; margin:0;">상대 전체 엔트리 (${opponentFullParty.members.length})</label>
                                <span style="font-size:0.75rem; background:#d32f2f; color:#fff; padding:2px 8px; border-radius:10px;">이 중 3마리 출전</span>
                            </div>
                            <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px;">
                                ${opponentFullParty.members.map(slot => {
                                    const data = fullPokes.find(p => p.id === slot.pokemonId);
                                    if (!data) {
                                        return `<div style="text-align:center; padding:8px; border-radius:8px; background:#fff; border:1px solid #eee; font-size:0.7rem; color:red;">알 수 없는 포켓몬<br>(ID: ${slot.pokemonId})</div>`;
                                    }
                                    return `
                                        <div style="text-align:center; padding:8px; border-radius:8px; background:#fff; border:1px solid #eee;">
                                            <div style="font-weight:bold; font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${data.nameKo}</div>
                                            <div style="font-size:0.7rem; color:#888;">Lv. ${slot.level}</div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>

                        <!-- 내 파티 선택 -->
                        <div class="card">
                            <label style="display:block; font-weight:bold; margin-bottom:12px;">내 파티 (6마리 중 3마리 선택)</label>
                            <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:10px;">
                                ${playerParty!.members.map((slot, idx) => {
                                    const data = fullPokes.find(p => p.id === slot.pokemonId);
                                    if (!data) {
                                        return `<div style="padding:12px; border-radius:10px; border:2px solid #eee; background:#fff; color:red; font-size:0.8rem;">알 수 없는 포켓몬 (ID: ${slot.pokemonId})</div>`;
                                    }
                                    const selectOrder = selectedIndices.indexOf(idx);
                                    const isSelected = selectOrder !== -1;
                                    return `
                                        <div class="selection-slot" data-idx="${idx}" style="cursor:pointer; padding:12px; border-radius:10px; border:2px solid ${isSelected ? 'var(--primary-color)' : '#eee'}; background:${isSelected ? 'rgba(var(--primary-rgb), 0.05)' : '#fff'}; position:relative; transition:all 0.2s;">
                                            ${isSelected ? `<div style="position:absolute; top:-8px; right:-8px; background:var(--primary-color); color:#fff; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:0.9rem; border:2px solid #fff; z-index:1;">${selectOrder + 1}</div>` : ''}
                                            <div style="font-weight:bold; font-size:0.95rem;">${data.nameKo}</div>
                                            <div style="font-size:0.8rem; color:#888;">Lv. ${slot.level}</div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>

                        <button id="btn-confirm-selection" class="btn btn-primary" style="width:100%; padding:15px; font-size:1.1rem; font-weight:bold; border-radius:10px;" ${selectedIndices.length === 3 ? '' : 'disabled'}>
                            ${selectedIndices.length === 3 ? '배틀 돌입!' : `${3 - selectedIndices.length}마리 더 선택하세요`}
                        </button>
                    </div>
                `;

                container.querySelectorAll('.selection-slot').forEach(el => {
                    el.addEventListener('click', () => {
                        const idx = parseInt(el.getAttribute('data-idx')!);
                        const existingIdx = selectedIndices.indexOf(idx);
                        if (existingIdx !== -1) {
                            selectedIndices.splice(existingIdx, 1);
                        } else if (selectedIndices.length < 3) {
                            selectedIndices.push(idx);
                        }
                        updateSelectionUI();
                    });
                });

                container.querySelector('#btn-confirm-selection')?.addEventListener('click', () => {
                    if (selectedIndices.length === 3 && playerParty) {
                        const pParty = playerParty;
                        const playerTeam = selectedIndices.map(idx => {
                            const slot = pParty.members[idx];
                            if (!slot) throw new Error('Slot not found');
                            return initBattlePoke(slot);
                        });
                        battleState = {
                            player: { name: '플레이어', team: playerTeam, activeIdx: 0 },
                            opponent: { name: '샌드백 AI', team: opponentBattleTeam, activeIdx: 0 },
                            turn: 1,
                            logs: [{ type: 'info', message: '배틀이 시작되었습니다!' }],
                            isFinished: false,
                            statusData
                        };
                        renderUI();
                    }
                });
            };

            updateSelectionUI();
        };

        const handlePostTurnFaints = () => {
            if (!battleState || battleState.isFinished) return false;

            let changed = false;
            // AI 자동 교체: 현재 포켓몬이 기절했다면 즉시 다음 포켓몬 선출
            const opponentSide = battleState.opponent;
            const opponentActive = opponentSide.team[opponentSide.activeIdx];
            if (opponentActive && opponentActive.isFainted) {
                const aliveIdx = opponentSide.team.findIndex(p => !p.isFainted);
                if (aliveIdx !== -1) {
                    const nextPoke = opponentSide.team[aliveIdx];
                    if (nextPoke) {
                        opponentSide.activeIdx = aliveIdx;
                        const newName = nextPoke.data.nameKo;
                        battleState.logs.push({ type: 'switch', message: `${opponentSide.name}은(는) ${newName}을(를) 내보냈다!` });
                        
                        // AI 교체 시 효과 발동
                        executeEffects(battleState, nextPoke, 'onEntry');
                        
                        changed = true;
                    }
                }
            }
            return changed;
        };

        const handlePlayerAction = (action: BattleAction) => {
            if (!battleState || battleState.isFinished) return;

            const playerActive = battleState.player.team[battleState.player.activeIdx];
            
            // 만약 현재 포켓몬이 기절한 상태에서의 교체라면, 턴을 소모하지 않는 '자유 교체'로 처리
            if (playerActive && playerActive.isFainted && action.type === 'switch') {
                const nextIdx = action.switchIdx ?? -1;
                const nextPoke = battleState.player.team[nextIdx];
                if (nextPoke && !nextPoke.isFainted) {
                    battleState.player.activeIdx = nextIdx;
                    const newName = nextPoke.data.nameKo;
                    battleState.logs.push({ type: 'switch', message: `${battleState.player.name}은(는) ${newName}을(를) 내보냈다!` });
                    
                    // 교체 시 효과 발동 (예: 위협 등)
                    executeEffects(battleState, nextPoke, 'onEntry');
                    
                    renderUI();
                    return;
                }
            }

            const aiAction = getAiAction(aiLevel, battleState.opponent, battleState.player);
            battleState = executeTurn(battleState, action, aiAction);
            
            // 턴 종료 후 기절한 포켓몬이 있다면 AI는 즉시 교체
            handlePostTurnFaints();
            
            renderUI();
        };

        const renderSetup = () => {
            container.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:12px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <h2 style="margin:0; font-size:1.3rem;">🥊 샌드백 AI 설정</h2>
                        <span style="background:var(--primary-color); color:#fff; padding:4px 12px; border-radius:20px; font-weight:bold; font-size:0.8rem;">3 vs 3</span>
                    </div>

                    <div class="card">
                        <label style="display:block; font-weight:bold; margin-bottom:8px; color:var(--text-color);">내 파티 선택</label>
                        <div style="display:flex; gap:8px; align-items:center;">
                            <div id="player-party-name" style="flex:1; padding:12px; border:1px solid #ddd; border-radius:8px; background:rgba(0,0,0,0.02); font-weight:bold;">
                                ${playerParty ? `🏟️ ${playerParty.name}` : '파티를 선택해주세요'}
                            </div>
                            <button id="btn-select-player-party" class="btn" style="white-space:nowrap; background:var(--primary-color); color:#fff;">변경</button>
                        </div>
                    </div>

                    <div class="card">
                        <label style="display:block; font-weight:bold; margin-bottom:12px; color:var(--text-color);">상대 AI 파티 후보 (중복 선택 가능)</label>
                        <div style="max-height:180px; overflow-y:auto; border:1px solid #eee; border-radius:8px; padding:4px; display:flex; flex-direction:column; gap:4px;">
                            ${savedParties.length > 0 ? savedParties.map(p => {
                                const isChecked = opponentParties.some(op => op.id === p.id);
                                return `
                                    <label style="display:flex; align-items:center; gap:10px; padding:10px; border-radius:6px; background:${isChecked ? 'rgba(var(--primary-rgb), 0.05)' : 'transparent'}; border:1px solid ${isChecked ? 'var(--primary-color)' : '#eee'}; cursor:pointer; transition:all 0.2s;">
                                        <input type="checkbox" class="opponent-party-check" data-id="${p.id}" ${isChecked ? 'checked' : ''} style="width:18px; height:18px;">
                                        <span style="flex:1; font-size:0.95rem;">${p.name}</span>
                                        <span style="font-size:0.8rem; color:#888;">(${p.members.length}마리)</span>
                                    </label>
                                `;
                            }).join('') : '<p style="text-align:center; color:#888; padding:20px;">저장된 파티가 없습니다.<br/>파티 빌더에서 파티를 먼저 만들어주세요.</p>'}
                        </div>
                        <p style="font-size:0.8rem; color:#888; margin-top:8px; margin-left:4px;">* 선택된 파티 중 하나가 랜덤하게 AI의 파티로 결정됩니다.</p>
                    </div>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                        <div class="card" style="margin-bottom:0;">
                            <label style="display:block; font-weight:bold; margin-bottom:8px; font-size:0.9rem;">AI 난이도</label>
                            <select id="select-ai-level" class="form-control" style="width:100%;">
                                <option value="beginner" ${aiLevel === 'beginner' ? 'selected' : ''}>🌱 입문</option>
                                <option value="normal" ${aiLevel === 'normal' ? 'selected' : ''}>⚔️ 일반 (준비중)</option>
                                <option value="expert" ${aiLevel === 'expert' ? 'selected' : ''}>👑 전문 (준비중)</option>
                            </select>
                        </div>
                        <div class="card" style="margin-bottom:0;">
                            <label style="display:block; font-weight:bold; margin-bottom:8px; font-size:0.9rem;">AI 선출 방식</label>
                            <select id="select-strategy" class="form-control" style="width:100%;">
                                <option value="order" ${selectionStrategy === 'order' ? 'selected' : ''}>순서대로(1~3)</option>
                                <option value="random" ${selectionStrategy === 'random' ? 'selected' : ''}>랜덤하게</option>
                            </select>
                        </div>
                    </div>

                    <button id="btn-start-battle" class="btn btn-primary" style="width:100%; padding:16px; font-size:1.1rem; font-weight:bold; border-radius:12px; margin-top:8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        배틀 시뮬레이션 시작!
                    </button>
                </div>
            `;

            container.querySelector('#btn-select-player-party')?.addEventListener('click', () => {
                openPartySelectorModal((_slot, party) => {
                    if (party) {
                        playerParty = party;
                        // 상태 업데이트 후 강제 재렌더링
                        renderSetup();
                    }
                });
            });

            container.querySelectorAll('.opponent-party-check').forEach(el => {
                el.addEventListener('change', (e) => {
                    const id = (e.target as HTMLInputElement).getAttribute('data-id');
                    const party = savedParties.find(p => p.id === id);
                    if (party) {
                        if ((e.target as HTMLInputElement).checked) {
                            if (!opponentParties.some(op => op.id === id)) opponentParties.push(party);
                        } else {
                            opponentParties = opponentParties.filter(op => op.id !== id);
                        }
                        renderSetup(); // UI 갱신 (배경색 등)
                    }
                });
            });

            container.querySelector('#select-ai-level')?.addEventListener('change', (e) => {
                aiLevel = (e.target as HTMLSelectElement).value as AILevel;
            });

            container.querySelector('#select-strategy')?.addEventListener('change', (e) => {
                selectionStrategy = (e.target as HTMLSelectElement).value as any;
            });

            container.querySelector('#btn-start-battle')?.addEventListener('click', startBattle);
        };

        const renderUI = () => {
            if (!battleState) {
                renderSetup();
                return;
            }

            const playerActive = battleState.player.team[battleState.player.activeIdx];
            const opponentActive = battleState.opponent.team[battleState.opponent.activeIdx];

            if (!playerActive || !opponentActive) return;

            container.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:15px; height:100%;">
                    <!-- 상대방 영역 -->
                    <div class="card" style="border-left: 5px solid #f44336;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <strong>${opponentActive.data.nameKo}</strong>
                            <span>Lv. ${opponentActive.level}</span>
                        </div>
                        <div style="background:#eee; height:10px; border-radius:5px; margin-top:8px; overflow:hidden;">
                            <div style="background:#4caf50; width:${(opponentActive.currentHp / opponentActive.maxHp) * 100}%; height:100%; transition: width 0.3s;"></div>
                        </div>
                        <div style="text-align:right; font-size:0.8rem; margin-top:4px;">${opponentActive.currentHp} / ${opponentActive.maxHp}</div>
                    </div>

                    <!-- 로그 영역 -->
                    <div id="battle-log" class="card" style="flex:1; overflow-y:auto; background:#f5f5f5; font-size:0.9rem; padding:10px; min-height:150px;">
                        ${battleState.logs.map(log => `<div style="margin-bottom:4px; border-bottom:1px solid #eee; padding-bottom:2px;">${log.message}</div>`).join('')}
                    </div>

                    <!-- 플레이어 영역 -->
                    <div class="card" style="border-left: 5px solid #2196f3;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <strong>${playerActive.data.nameKo}</strong>
                            <span>Lv. ${playerActive.level}</span>
                        </div>
                        <div style="background:#eee; height:10px; border-radius:5px; margin-top:8px; overflow:hidden;">
                            <div style="background:#4caf50; width:${(playerActive.currentHp / playerActive.maxHp) * 100}%; height:100%; transition: width 0.3s;"></div>
                        </div>
                        <div style="text-align:right; font-size:0.8rem; margin-top:4px;">${playerActive.currentHp} / ${playerActive.maxHp}</div>
                    </div>

                    <!-- 컨트롤 영역 -->
                    <div class="card" style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                        ${battleState.isFinished ? `
                            <button id="btn-reset-battle" class="btn btn-primary" style="grid-column: span 2; padding:12px;">다시 하기</button>
                        ` : `
                            ${playerActive.isFainted ? `
                                <div style="grid-column: span 2; text-align:center; padding:10px; color:#d32f2f; font-weight:bold;">
                                    포켓몬이 기절했습니다! 교체해주세요.
                                </div>
                            ` : playerActive.moves.map((move, i) => `
                                <button class="btn btn-move" data-idx="${i}" style="padding:12px; font-size:0.9rem;">${move.nameKo}</button>
                            `).join('')}
                            <button id="btn-open-switch" class="btn" style="grid-column: span 2; margin-top:8px; ${playerActive.isFainted ? 'border:2px solid var(--primary-color); animation: pulse 1.5s infinite;' : ''}">교체하기</button>
                        `}
                    </div>
                </div>

                <style>
                    @keyframes pulse {
                        0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(var(--primary-rgb), 0.4); }
                        70% { transform: scale(1.02); box-shadow: 0 0 0 10px rgba(var(--primary-rgb), 0); }
                        100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(var(--primary-rgb), 0); }
                    }
                </style>
            `;

            // 스크롤 하단으로
            const logEl = container.querySelector('#battle-log');
            if (logEl) logEl.scrollTop = logEl.scrollHeight;

            container.querySelectorAll('.btn-move').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = parseInt((e.target as HTMLElement).getAttribute('data-idx')!);
                    handlePlayerAction({ type: 'move', side: 'player', moveIdx: idx });
                });
            });

            container.querySelector('#btn-reset-battle')?.addEventListener('click', () => {
                battleState = null;
                renderUI();
            });

            container.querySelector('#btn-open-switch')?.addEventListener('click', () => {
                const pState = battleState!;
                const choices = pState.player.team.map((p, i) => `${i}: ${p.data.nameKo} (HP: ${p.currentHp}/${p.maxHp})${p.isFainted ? ' [기절]' : ''}`).join('\n');
                const choice = prompt(`교체할 포켓몬 번호를 선택하세요:\n${choices}`);
                const idx = parseInt(choice || '');
                if (!isNaN(idx) && pState.player.team[idx] && !pState.player.team[idx].isFainted && idx !== pState.player.activeIdx) {
                    handlePlayerAction({ type: 'switch', side: 'player', switchIdx: idx });
                } else if (idx === pState.player.activeIdx) {
                    alert('이미 배틀 중인 포켓몬입니다.');
                } else if (!isNaN(idx)) {
                    alert('유효하지 않은 선택입니다.');
                }
            });
        };

        renderUI();
        return () => {};

    } catch (err) {
        container.innerHTML = `<p style="color:red;">오류: ${err}</p>`;
        return () => {};
    }
}

import { parseShowdown, exportShowdown, type ParserContext } from '../parser.js';
import type { PokemonSlot } from '../types.js';

interface ModalOptions {
    container: HTMLElement;
    mode: 'import' | 'export';
    ctx: ParserContext;
    onImport?: (slots: PokemonSlot[]) => void;
    slots?: PokemonSlot[];
}

export function renderImportExportModal(options: ModalOptions) {
    const { mode, ctx, onImport, slots } = options;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); z-index: 10000;
        display: flex; align-items: center; justify-content: center;
        backdrop-filter: blur(5px);
    `;

    const content = document.createElement('div');
    content.className = 'card';
    content.style.cssText = `
        width: 90%; max-width: 600px; max-height: 80vh;
        display: flex; flex-direction: column; gap: 15px;
        padding: 20px; overflow: hidden;
    `;

    const title = mode === 'import' ? 'Showdown 텍스트 가져오기' : 'Showdown 텍스트 내보내기';
    const initialText = mode === 'export' && slots 
        ? slots.filter(s => s.pokemonId !== 0).map(s => exportShowdown(s, ctx, 'ko')).join('\n\n')
        : '';

    content.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <h3 style="margin:0;">${title}</h3>
            <button id="modal-close" class="btn btn-icon">❌</button>
        </div>
        <p style="font-size:0.85rem; color:#666; margin:0;">
            ${mode === 'import' ? 'Showdown 또는 PokéPaste 형식의 텍스트를 붙여넣으세요.' : '아래 텍스트를 복사하여 사용하세요.'}
        </p>
        <textarea id="modal-textarea" style="flex:1; min-height: 300px; padding: 10px; font-family: monospace; font-size: 0.9rem; border:1px solid #ddd; border-radius:8px; resize:none;">${initialText}</textarea>
        <div style="display:flex; gap:10px;">
            <button id="btn-lang-en" class="btn" style="flex:1; display:${mode === 'export' ? 'block' : 'none'};">🇺🇸 영어로</button>
            <button id="btn-lang-ko" class="btn" style="flex:1; display:${mode === 'export' ? 'block' : 'none'};">🇰🇷 한국어로</button>
            <button id="btn-action" class="btn btn-primary" style="flex:2;">${mode === 'import' ? '가져오기' : '복사하기'}</button>
        </div>
    `;

    const textarea = content.querySelector('#modal-textarea') as HTMLTextAreaElement;

    content.querySelector('#modal-close')?.addEventListener('click', () => modal.remove());

    content.querySelector('#btn-lang-en')?.addEventListener('click', () => {
        if (slots) textarea.value = slots.filter(s => s.pokemonId !== 0).map(s => exportShowdown(s, ctx, 'en')).join('\n\n');
    });

    content.querySelector('#btn-lang-ko')?.addEventListener('click', () => {
        if (slots) textarea.value = slots.filter(s => s.pokemonId !== 0).map(s => exportShowdown(s, ctx, 'ko')).join('\n\n');
    });

    content.querySelector('#btn-action')?.addEventListener('click', async () => {
        if (mode === 'import') {
            const parsed = parseShowdown(textarea.value, ctx);
            if (parsed.length > 0) {
                onImport?.(parsed);
                modal.remove();
            } else {
                alert('파싱 가능한 데이터를 찾지 못했습니다.');
            }
        } else {
            try {
                await navigator.clipboard.writeText(textarea.value);
                alert('클립보드에 복사되었습니다.');
            } catch (err) {
                alert('복사 실패');
            }
        }
    });

    modal.appendChild(content);
    document.body.appendChild(modal);
}

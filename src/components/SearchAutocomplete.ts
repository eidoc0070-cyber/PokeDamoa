import { hangulIncludes, searchFuzzy } from '../utils/hangul.js';
import { createElement } from '../utils/dom.js';

interface AutocompleteOptions<T> {
    container: HTMLElement;
    label: string;
    placeholder: string;
    data: T[];
    getSearchKey: (item: T) => string;
    getDisplayName: (item: T) => string;
    getDisplaySub: (item: T) => string;
    onSelect: (item: T) => void;
    initialValue?: string | undefined;
    renderItemExtra?: ((item: T) => string) | undefined;
    getItemStyle?: ((item: T) => Partial<CSSStyleDeclaration>) | undefined;
}

export function createAutocomplete<T>(options: AutocompleteOptions<T>) {
    let { container, label, placeholder, data, getSearchKey, getDisplayName, getDisplaySub, onSelect, initialValue, renderItemExtra, getItemStyle } = options;

    const wrapper = createElement('div', {
        style: { position: 'relative', marginBottom: '15px' }
    });

    const labelEl = createElement('label', {
        text: label,
        style: { fontWeight: 'bold', display: 'block', marginBottom: '5px', fontSize: '0.9em' }
    });

    const input = createElement('input', {
        attributes: { type: 'text', placeholder, value: initialValue || '' },
        style: { width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem', boxSizing: 'border-box' }
    });

    const dropdown = createElement('div', {
        style: {
            display: 'none',
            position: 'absolute',
            top: '100%',
            left: '0',
            width: '100%',
            maxHeight: '200px',
            overflowY: 'auto',
            background: '#fff',
            border: '1px solid #ccc',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            borderRadius: '4px',
            zIndex: '1000'
        }
    });

    const renderDropdown = () => {
        const term = input.value.toLowerCase().trim();
        if (!term) {
            dropdown.style.display = 'none';
            return;
        }

        // searchFuzzy를 사용하여 오타 허용 및 검색 순위 최적화
        const results = searchFuzzy(data, term, (item: any) => {
            // JSON 구조 변경안이 적용된 경우 (d, c 필드 직접 사용)
            if (item.d && item.c) {
                return { 
                    nameKo: item.nameKo || '', 
                    nameEn: item.nameEn || '', 
                    disassembled: item.d, 
                    chosung: item.c 
                };
            }
            
            const searchKey = getSearchKey(item);
            // 기존 searchKey가 pipe(|)로 구분된 경우 분리하여 사용
            if (searchKey.includes('|')) {
                const [nameKo, nameEn, disassembled, chosung] = searchKey.split('|');
                return { nameKo, nameEn, disassembled, chosung };
            }
            // 일반 문자열인 경우 (하위 호환성)
            return { nameKo: searchKey, nameEn: '', disassembled: '', chosung: '' };
        });

        const matches = results.slice(0, 30).map(res => res.item);
        
        dropdown.innerHTML = '';
        if (matches.length === 0) {
            dropdown.innerHTML = '<div style="padding:10px; color:#888;">검색 결과가 없습니다.</div>';
        } else {
            matches.forEach(item => {
                const customStyle = getItemStyle ? getItemStyle(item) : {};
                const extraHtml = renderItemExtra ? renderItemExtra(item) : '';
                
                const itemEl = createElement('div', {
                    className: 'autocomplete-item',
                    style: { 
                        padding: '12px 10px', 
                        borderBottom: '1px solid #eee', 
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                        ...customStyle
                    },
                    html: `
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div style="display:flex; flex-direction:column;">
                                <strong style="font-size:1rem;">${getDisplayName(item)}</strong>
                                <span style="color:#888; font-size:0.8rem;">${getDisplaySub(item)}</span>
                            </div>
                            ${extraHtml}
                        </div>
                    `
                });
                itemEl.addEventListener('click', () => {
                    input.value = getDisplayName(item);
                    dropdown.style.display = 'none';
                    onSelect(item);
                });
                dropdown.appendChild(itemEl);
            });
        }
        dropdown.style.display = 'block';
    };

    input.addEventListener('input', renderDropdown);

    // 외부 클릭 시 드롭다운 닫기
    const globalClickListener = (e: MouseEvent) => {
        if (e.target !== input && e.target !== dropdown && !dropdown.contains(e.target as Node)) {
            dropdown.style.display = 'none';
        }
    };
    document.addEventListener('click', globalClickListener);

    wrapper.appendChild(labelEl);
    wrapper.appendChild(input);
    wrapper.appendChild(dropdown);
    container.appendChild(wrapper);

    return {
        setValue: (val: string) => { input.value = val; },
        setData: (newData: T[]) => { data = newData; },
        setOptions: (newOptions: Partial<AutocompleteOptions<T>>) => {
            if (newOptions.getItemStyle) getItemStyle = newOptions.getItemStyle;
            if (newOptions.renderItemExtra) renderItemExtra = newOptions.renderItemExtra;
            if (newOptions.label) labelEl.textContent = newOptions.label;
            if (newOptions.placeholder) input.placeholder = newOptions.placeholder;
        },
        destroy: () => {
            document.removeEventListener('click', globalClickListener);
            wrapper.remove();
        }
    };
}

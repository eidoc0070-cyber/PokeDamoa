import { hangulIncludes } from '../utils/hangul.js';
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
    initialValue?: string;
    renderItemExtra?: (item: T) => string;
}

export function createAutocomplete<T>(options: AutocompleteOptions<T>) {
    const { container, label, placeholder, data, getSearchKey, getDisplayName, getDisplaySub, onSelect, initialValue, renderItemExtra } = options;

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

    input.addEventListener('input', () => {
        const term = input.value.toLowerCase().trim();
        if (!term) {
            dropdown.style.display = 'none';
            return;
        }

        const matches = data.filter(item => hangulIncludes(getSearchKey(item), term)).slice(0, 30);
        
        dropdown.innerHTML = '';
        if (matches.length === 0) {
            dropdown.innerHTML = '<div style="padding:10px; color:#888;">검색 결과가 없습니다.</div>';
        } else {
            matches.forEach(item => {
                const itemEl = createElement('div', {
                    className: 'autocomplete-item',
                    style: { padding: '10px', borderBottom: '1px solid #eee', cursor: 'pointer' },
                    html: `
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span>
                                <strong>${getDisplayName(item)}</strong>
                                <span style="color:#888; font-size:0.8em; margin-left:5px;">${getDisplaySub(item)}</span>
                            </span>
                            ${renderItemExtra ? renderItemExtra(item) : ''}
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
    });

    // 외부 클릭 시 드롭다운 닫기
    document.addEventListener('click', (e) => {
        if (e.target !== input && e.target !== dropdown) {
            dropdown.style.display = 'none';
        }
    });

    wrapper.appendChild(labelEl);
    wrapper.appendChild(input);
    wrapper.appendChild(dropdown);
    container.appendChild(wrapper);

    return {
        setValue: (val: string) => { input.value = val; }
    };
}

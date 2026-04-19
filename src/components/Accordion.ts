export function renderAccordion(options: {
    id: string;
    title: string;
    icon?: string;
    contentHtml: string;
    isOpen?: boolean;
    borderColor?: string;
}): string {
    const { id, title, icon = '', contentHtml, isOpen = true, borderColor = '#ddd' } = options;
    const displayStyle = isOpen ? 'block' : 'none';
    const chevron = isOpen ? '▲' : '▼';
    
    return `
        <div class="accordion-item" style="border: 2px solid ${borderColor}; border-radius: 12px; margin-bottom: 16px; background: var(--surface-color, #fff); overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
            <div class="accordion-header" 
                 onclick="
                    const content = document.getElementById('${id}-content');
                    const isNowHidden = content.style.display === 'none';
                    content.style.display = isNowHidden ? 'block' : 'none';
                    this.querySelector('.chevron').textContent = isNowHidden ? '▲' : '▼';
                 " 
                 style="padding: 16px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; background: rgba(0,0,0,0.02); user-select: none;">
                <h3 style="margin: 0; display: flex; align-items: center; gap: 8px; color: ${borderColor}; font-size: 1.1rem;">
                    ${icon ? `<span>${icon}</span>` : ''} ${title}
                </h3>
                <span class="chevron" style="color: #888; font-size: 0.9rem; font-weight: bold; padding: 4px;">${chevron}</span>
            </div>
            <div id="${id}-content" class="accordion-content" style="padding: 16px; display: ${displayStyle}; border-top: 1px solid #f0f0f0;">
                ${contentHtml}
            </div>
        </div>
    `;
}

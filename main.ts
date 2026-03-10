//abcd
// DOM 요소가 모두 로드된 후 실행
document.addEventListener('DOMContentLoaded', (): void => {
    // HTMLButtonElement로 타입 단언 (Type Assertion)
    const button = document.getElementById('actionButton') as HTMLButtonElement | null;
        // HTMLParagraphElement로 타입 단언
    const message = document.getElementById('message') as HTMLParagraphElement | null;

    // 요소가 존재할 경우에만 이벤트 리스너 등록 (Optional Chaining 활용 가능)
    if (button && message) {
        // [수정 포인트 1] 클릭 함수 밖에서 '현재 버튼의 글자'를 미리 저장해둡니다.
        const originalText: string = button.textContent ?? '클릭해보세요';

        button.addEventListener('click', (): void => {
            message.textContent = '반갑습니다! 타입스크립트가 정상적으로 동작하고 있습니다. 💙';
            
            button.textContent = '클릭됨!';

            setTimeout((): void => {
                // [수정 포인트 2] 미리 저장해둔 값을 재사용합니다.
                button.textContent = originalText;
            }, 2000);
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('actionButton');
    const message = document.getElementById('message');

    button.addEventListener('click', () => {
        message.textContent = '반갑습니다! 자바스크립트가 정상적으로 동작하고 있습니다. 🎉';
        
        // 버튼 텍스트 변경 (효과 확인용)
        button.textContent = '클릭됨!';
        setTimeout(() => {
            button.textContent = '다시 클릭해보세요';
        }, 2000);
    });
});

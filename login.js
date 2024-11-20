document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!username || !password) {
        showError('Iltimos, foydalanuvchi nomi va parolni kiriting.');
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password }),
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.json();
            showError(errorData.error || 'Xatolik yuz berdi');
            return;
        }

        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem('userId', data.userId);
            localStorage.setItem('userRole', data.role);
            if (data.role === 'admin') {
                window.location.href = 'admin.html';
            } else if (data.role === 'student') {
                window.location.href = 'student.html';
            }
        } else {
            showError(data.error || 'Login ma\'lumotlari noto\'g\'ri');
        }
    } catch (error) {
        console.error('Server bilan bog\'lanishda xatolik:', error);
        showError('Server bilan bog\'lanishda xatolik yuz berdi.');
    }
});

function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
}
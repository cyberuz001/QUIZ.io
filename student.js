document.addEventListener('DOMContentLoaded', function() {
    const testPage = document.getElementById('testPage');
    const resultsPage = document.getElementById('resultsPage');
    const testBtn = document.getElementById('testBtn');
    const resultsBtn = document.getElementById('resultsBtn');

    testBtn.addEventListener('click', function(e) {
        e.preventDefault();
        testPage.classList.remove('hidden');
        resultsPage.classList.add('hidden');
    });

    resultsBtn.addEventListener('click', function(e) {
        e.preventDefault();
        testPage.classList.add('hidden');
        resultsPage.classList.remove('hidden');
    });
});




document.addEventListener('DOMContentLoaded', () => {
    const testPage = document.getElementById('testPage');
    const resultsPage = document.getElementById('resultsPage');
    const testBtn = document.getElementById('testBtn');
    const resultsBtn = document.getElementById('resultsBtn');
    const submitAnswerBtn = document.getElementById('submitAnswer');
    const questionContainer = document.getElementById('questionContainer');
    const resultsContainer = document.getElementById('resultsContainer');
    const profileSection = document.getElementById('profileSection');

    let currentTest = null;
    let testIndex = 0;
    let tests = [];

    function showPage(pageToShow) {
        [testPage, resultsPage].forEach(page => page.classList.add('hidden'));
        pageToShow.classList.remove('hidden');
    }

    testBtn.addEventListener('click', () => {
        showPage(testPage);
        loadTests();
    });

    resultsBtn.addEventListener('click', () => {
        showPage(resultsPage);
        loadResults();
    });

    submitAnswerBtn.addEventListener('click', submitAnswer);

    async function loadProfile() {
        try {
            const userId = localStorage.getItem('userId');
            const response = await fetch(`http://localhost:3000/api/student-profile/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${userId}`
                },
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch profile');
            const profile = await response.json();
            displayProfile(profile);
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    }

    function displayProfile(profile) {
        profileSection.innerHTML = `
            <div class="p-4 rounded-lg glassmorphism shadow-md flex items-center space-x-4">
                <img src="${profile.avatar}" alt="Profile" class="w-12 h-12 rounded-full ">
                <div>
                    <h2 class="text-xl font-semibold">${profile.name} ${profile.surname}</h2>
                    <p class="text-gray-200">${profile.username}</p>
                </div>
            </div>
        `;
    }

    async function loadTests() {
        try {
            const userId = localStorage.getItem('userId');
            const response = await fetch('http://localhost:3000/api/student-tests', {
                headers: {
                    'Authorization': `Bearer ${userId}`
                },
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch tests');
            tests = await response.json();
            if (tests.length > 0 && !tests.message) {
                currentTest = tests[0];
                displayTest(currentTest);
            } else {
                questionContainer.innerHTML = '<p>Hozircha testlar mavjud emas yoki barcha testlar yakunlangan.</p>';
                submitAnswerBtn.disabled = true;
            }
        } catch (error) {
            console.error('Error loading tests:', error);
            questionContainer.innerHTML = '<p>Testlarni yuklashda xatolik yuz berdi.</p>';
        }
    }

    function displayTest(test) {
        questionContainer.innerHTML = `
            <h3 class="text-xl font-semibold mb-4">${testIndex + 1}. ${test.question}</h3>
            <div class="space-y-2">
                ${['A', 'B', 'C', 'D'].map(option => `
                    <div>
                        <input type="radio" id="answer_${option}" name="answer" value="${option}">
                        <label for="answer_${option}">${option}. ${test['answer_' + option.toLowerCase()]}</label>
                    </div>
                `).join('')}
            </div>
        `;
    }

    async function submitAnswer() {
        const selectedAnswer = document.querySelector('input[name="answer"]:checked');
        if (!selectedAnswer) {
            alert('Iltimos, javobni tanlang');
            return;
        }

        try {
            const userId = localStorage.getItem('userId');
            const response = await fetch('http://localhost:3000/api/submit-test', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userId}`
                },
                body: JSON.stringify({ 
                    questionId: currentTest.id, 
                    answer: selectedAnswer.value 
                }),
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Failed to submit test');

            testIndex++;
            if (testIndex < tests.length) {
                currentTest = tests[testIndex];
                displayTest(currentTest);
            } else {
                alert('Barcha testlar yakunlandi!');
                loadResults();
            }
        } catch (error) {
            console.error('Error submitting answer:', error);
            alert('Javobni yuborishda xatolik yuz berdi.');
        }
    }

    async function loadResults() {
        try {
            const userId = localStorage.getItem('userId');
            const response = await fetch('http://localhost:3000/api/results', {
                headers: {
                    'Authorization': `Bearer ${userId}`
                },
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch results');
            const results = await response.json();
            if (results.length === 0) {
                resultsContainer.innerHTML = '<p>Hozircha natijalar mavjud emas. Yangi testlar kelganda bu yerda natijalar ko\'rsatiladi.</p>';
            } else {
                displayResults(results);
            }
        } catch (error) {
            console.error('Error loading results:', error);
            resultsContainer.innerHTML = '<p>Natijalarni yuklashda xatolik yuz berdi.</p>';
        }
    }

    function displayResults(results) {
        const totalQuestions = results.length;
        const correctAnswers = results.filter(result => result.is_correct).length;
        
        resultsContainer.innerHTML = `
            <div class="mb-4 p-4 border rounded">
                <h3 class="text-xl font-semibold mb-2">Umumiy natija</h3>
                <p>Jami savollar soni: ${totalQuestions}</p>
                <p>To'g'ri javoblar soni: ${correctAnswers}</p>
                <p>Foiz: ${((correctAnswers / totalQuestions) * 100).toFixed(2)}%</p>
            </div>
            <h3 class="text-xl font-semibold mb-4">Batafsil natijalar:</h3>
            ${results.map((result, index) => `
                <div class="mb-4 p-4 border rounded">
                    <p class="font-bold">Savol ${index + 1}</p>
                    <p>Sizning javobingiz: ${result.answer}</p>
                    <p class="${result.is_correct ? "text-green-500" : "text-red-500"}">
                        ${result.is_correct ? "To'g'ri" : "Noto'g'ri"}
                    </p>
                </div>
            `).join('')}
        `;
    }

    // Dastlabki yuklash
    loadProfile();
    showPage(testPage);
    loadTests();
});
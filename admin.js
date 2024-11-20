document.addEventListener('DOMContentLoaded', () => {
    const testPage = document.getElementById('testPage');
    const createdTestsPage = document.getElementById('createdTestsPage');
    const studentPage = document.getElementById('studentPage');
    const studentsListPage = document.getElementById('studentsListPage');

    const createTestBtn = document.getElementById('createTestBtn');
    const createdTestsBtn = document.getElementById('createdTestsBtn');
    const studentBtn = document.getElementById('studentBtn');
    const studentsListBtn = document.getElementById('studentsListBtn');
    const sendTestsButton = document.getElementById('sendTestsButton');

    function showPage(pageToShow) {
        [testPage, createdTestsPage, studentPage, studentsListPage].forEach(page => {
            if (page) {
                page.classList.add('hidden');
            }
        });
        if (pageToShow) {
            pageToShow.classList.remove('hidden');
        }
    }

    createTestBtn.addEventListener('click', () => showPage(testPage));
    createdTestsBtn.addEventListener('click', () => {
        showPage(createdTestsPage);
        loadCreatedTests();
    });
    studentBtn.addEventListener('click', () => showPage(studentPage));
    studentsListBtn.addEventListener('click', () => {
        showPage(studentsListPage);
        loadStudentsList();
    });

    // Test yaratish formasi
    document.getElementById('testForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const question = document.getElementById('testName').value;
        const answers = {
            A: document.getElementById('testAnswerA').value,
            B: document.getElementById('testAnswerB').value,
            C: document.getElementById('testAnswerC').value,
            D: document.getElementById('testAnswerD').value
        };
        const correctAnswer = document.getElementById('correctAnswer').value;

        try {
            const response = await fetch('http://localhost:3000/api/tests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ question, answers, correctAnswer }),
                credentials: 'include'
            });

            if (response.ok) {
                alert('Test muvaffaqiyatli yaratildi');
                document.getElementById('testForm').reset();
                showPage(createdTestsPage);
                loadCreatedTests();
            } else {
                alert('Test yaratishda xatolik yuz berdi');
            }
        } catch (error) {
            console.error('Xatolik:', error);
            alert('Test yaratishda xatolik yuz berdi');
        }
    });

    // O'quvchi qo'shish formasi
    document.getElementById('studentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('studentUsername').value;
        const password = document.getElementById('studentPassword').value;
        const name = document.getElementById('studentName').value;
        const surname = document.getElementById('studentSurname').value;

        try {
            const response = await fetch('http://localhost:3000/api/students', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password, name, surname }),
                credentials: 'include'
            });

            if (response.ok) {
                alert('O\'quvchi muvaffaqiyatli qo\'shildi');
                document.getElementById('studentForm').reset();
                loadStudentsList(); // Refresh the students list
            } else {
                alert('O\'quvchi qo\'shishda xatolik yuz berdi');
            }
        } catch (error) {
            console.error('Xatolik:', error);
            alert('O\'quvchi qo\'shishda xatolik yuz berdi');
        }
    });

    async function loadCreatedTests() {
        try {
            const response = await fetch('http://localhost:3000/api/tests', {
                credentials: 'include'
            });
            const tests = await response.json();
            displayCreatedTests(tests);
        } catch (error) {
            console.error('Testlarni yuklashda xatolik:', error);
        }
    }

    function displayCreatedTests(tests) {
        const testList = document.getElementById('testList');
        testList.innerHTML = tests.map(test => `
            <div class="bg-gray-100 p-4 rounded-lg mb-4">
                <h3 class="font-bold">${test.question}</h3>
                <p>A: ${test.answer_a}</p>
                <p>B: ${test.answer_b}</p>
                <p>C: ${test.answer_c}</p>
                <p>D: ${test.answer_d}</p>
                <p>To'g'ri javob: ${test.correct_answer}</p>
                <button class="delete-test-btn mt-2 bg-red-500 text-white font-semibold py-1 px-2 rounded-md hover:bg-red-600 transition duration-300 ease-in-out transform hover:scale-105" data-test-id="${test.id}">
                    O'chirish
                </button>
            </div>
        `).join('');

        // Testni o'chirish tugmalari
        document.querySelectorAll('.delete-test-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const testId = e.target.getAttribute('data-test-id');
                try {
                    const response = await fetch(`http://localhost:3000/api/tests/${testId}`, {
                        method: 'DELETE',
                        credentials: 'include'
                    });
                    if (response.ok) {
                        alert('Test muvaffaqiyatli o\'chirildi');
                        loadCreatedTests();
                    } else {
                        alert('Testni o\'chirishda xatolik yuz berdi');
                    }
                } catch (error) {
                    console.error('Xatolik:', error);
                    alert('Testni o\'chirishda xatolik yuz berdi');
                }
            });
        });

    }

    // Testlarni o'quvchilarga yuborish
    sendTestsButton.addEventListener('click', async () => {
        try {
            const response = await fetch('http://localhost:3000/api/send-tests', {
                method: 'POST',
                credentials: 'include'
            });
            if (response.ok) {
                alert('Testlar muvaffaqiyatli yuborildi va eski natijalar tozalandi');
                loadStudentsList(); // O'quvchilar ro'yxatini yangilash
            } else {
                alert('Testlarni yuborishda xatolik yuz berdi');
            }
        } catch (error) {
            console.error('Xatolik:', error);
            alert('Testlarni yuborishda xatolik yuz berdi');
        }
    });

    document.getElementById('clearTestsButton').addEventListener('click', async () => {
        if (confirm('Haqiqatan ham barcha testlarni o\'chirmoqchimisiz?')) {
            try {
                const response = await fetch('http://localhost:3000/api/clear-tests', {
                    method: 'POST',
                    credentials: 'include'
                });
                if (response.ok) {
                    alert('Barcha testlar muvaffaqiyatli o\'chirildi');
                    loadCreatedTests(); // Refresh the tests list
                } else {
                    alert('Testlarni o\'chirishda xatolik yuz berdi');
                }
            } catch (error) {
                console.error('Xatolik:', error);
                alert('Testlarni o\'chirishda xatolik yuz berdi');
            }
        }
    });

    async function loadStudentsList() {
        try {
            const response = await fetch('http://localhost:3000/api/students-list', {
                credentials: 'include'
            });
            const students = await response.json();
            displayStudentsList(students);
        } catch (error) {
            console.error('O\'quvchilar ro\'yxatini yuklashda xatolik:', error);
        }
    }

    function displayStudentsList(students) {
        const tableBody = document.getElementById('studentsTableBody');
        tableBody.innerHTML = students.map(student => `
        <tr>
            <td class="border px-4 py-2">${student.id}</td>
            <td class="border px-4 py-2">${student.name}</td>
            <td class="border px-4 py-2">${student.surname}</td>
            <td class="border px-4 py-2">${student.username}</td>
            <td class="border px-4 py-2">${student.password}</td>
            <td class="border px-4 py-2">${student.correct_answers}</td>
            <td class="border px-4 py-2">${student.wrong_answers}</td>
            <td class="border px-4 py-2">${student.total_tests}</td>
            
            <td class="border px-4 py-2">
                <button class="delete-student-btn bg-red-500 text-white p-2 rounded-full hover:bg-red-600" data-student-id="${student.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                </button>
            </td>
        </tr>
    `).join('');

    // Add event listeners for delete buttons
    document.querySelectorAll('.delete-student-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const studentId = e.target.closest('button').getAttribute('data-student-id');
            if (confirm('Haqiqatan ham bu o\'quvchini o\'chirmoqchimisiz?')) {
                try {
                    const response = await fetch(`http://localhost:3000/api/students/${studentId}`, {
                        method: 'DELETE',
                        credentials: 'include'
                    });
                    if (response.ok) {
                        alert('O\'quvchi muvaffaqiyatli o\'chirildi');
                        loadStudentsList(); // Refresh the list
                    } else {
                        alert('O\'quvchini o\'chirishda xatolik yuz berdi');
                    }
                } catch (error) {
                    console.error('Xatolik:', error);
                    alert('O\'quvchini o\'chirishda xatolik yuz berdi');
                }
            }
        });
    });
    }

    // Dastlabki sahifa yuklash
    showPage(testPage);
});
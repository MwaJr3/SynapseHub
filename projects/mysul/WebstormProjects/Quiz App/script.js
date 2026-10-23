const texts = {
    en: {
    title: "Quiz App",
    next: "Next",
    restart: "Restart Quiz",
    previousScores: "Previous Scores:",
    clearHistory: "Clear History",
    yourScore: "Your Score:",
    category: "Category"
    },
    es: {
    title: "Aplicación de Quiz",
    next: "Siguiente",
    restart: "Reiniciar Quiz",
    previousScores: "Puntuaciones anteriores:",
    clearHistory: "Borrar historial",
    yourScore: "Tu puntuación:",
    category: "Categoría"
    },
    fr: {
    title: "Application de Quiz",
    next: "Suivant",
    restart: "Redémarrer le Quiz",
    previousScores: "Scores précédents:",
    clearHistory: "Effacer l'historique",
    yourScore: "Votre score:",
    category: "Catégorie"
    },
    de: {
    title: "Quiz-App",
    next: "Weiter",
    restart: "Quiz neu starten",
    previousScores: "Frühere Ergebnisse:",
    clearHistory: "Verlauf löschen",
    yourScore: "Dein Ergebnis:",
    category: "Kategorie"
    },
    zh: {
    title: "测验应用",
    next: "下一个",
    restart: "重新开始测验",
    previousScores: "以前的分数:",
    clearHistory: "清除历史",
    yourScore: "你的分数:",
    category: "类别"
    },
    ar: {
    title: "تطبيق اختبار",
    next: "التالي",
    restart: "إعادة الاختبار",
    previousScores: "النتائج السابقة:",
    clearHistory: "مسح السجل",
    yourScore: "درجتك:",
    category: "الفئة"
    },
    hi: {
    title: "क्विज़ ऐप",
    next: "अगला",
    restart: "क्विज़ रीस्टार्ट करें",
    previousScores: "पिछले स्कोर:",
    clearHistory: "इतिहास साफ करें",
    yourScore: "आपका स्कोर:",
    category: "श्रेणी"
    },
    ru: {
    title: "Приложение Викторины",
    next: "Следующий",
    restart: "Перезапустить Викторину",
    previousScores: "Предыдущие результаты:",
    clearHistory: "Очистить историю",
    yourScore: "Ваш результат:",
    category: "Категория"
    },
    pt: {
    title: "Aplicativo de Quiz",
    next: "Próximo",
    restart: "Reiniciar Quiz",
    previousScores: "Pontuações anteriores:",
    clearHistory: "Limpar histórico",
    yourScore: "Sua pontuação:",
    category: "Categoria"
    },
    ja: {
    title: "クイズアプリ",
    next: "次へ",
    restart: "クイズを再開する",
    previousScores: "以前のスコア:",
    clearHistory: "履歴を消去",
    yourScore: "あなたのスコア:",
    category: "カテゴリ"
    }
};

let currentLanguage = localStorage.getItem('quizLang') || 'en';
function loadLanguages() {
    languageSelect.innerHTML = '';
    for (let lang in texts) {
    const option = document.createElement('option');
    option.value = lang;
    option.textContent = texts[lang].title;
    languageSelect.appendChild(option);
    }
}

loadLanguages();
languageSelect.value = currentLanguage;

function updateLanguage() {
    document.querySelector('h1').textContent = texts[currentLanguage].title;
    nextButton.textContent = texts[currentLanguage].next;
    restartButton.textContent = texts[currentLanguage].restart;
    document.querySelector('#result h3').textContent = texts[currentLanguage].previousScores;
    clearHistoryButton.textContent = texts[currentLanguage].clearHistory;
    document.querySelector('#result h2').childNodes[0].textContent = texts[currentLanguage].yourScore + " ";

    // Update category label if you have a label
    // If you add <label for="category-select"> in HTML
}

const languageSelect = document.getElementById('language-select');

languageSelect.value = currentLanguage;

languageSelect.addEventListener('change', () => {
currentLanguage = languageSelect.value;
localStorage.setItem('quizLang', currentLanguage);
updateLanguage();
});

// Call on page load
updateLanguage();

const quizData = {
    science: [
    {
        question: "What planet is known as the Red Planet?",
        options: ["Earth", "Mars", "Jupiter", "Venus"],
        answer: "Mars"
    },
    {
        question: "What gas do plants absorb?",
        options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Helium"],
        answer: "Carbon Dioxide"
    }
    ],
    history: [
    {
        question: "Who discovered America?",
        options: ["Christopher Columbus", "Marco Polo", "Ferdinand Magellan", "Vasco da Gama"],
        answer: "Christopher Columbus"
    },
    {
        question: "In which year did World War II end?",
        options: ["1945", "1939", "1918", "1965"],
        answer: "1945"
    }
    ],
    math: [
    {
        question: "What is 7 x 8?",
        options: ["54", "56", "58", "64"],
        answer: "56"
    },
    {
        question: "What is the square root of 64?",
        options: ["6", "8", "10", "12"],
        answer: "8"
    }
    ],
    General: [
        {
            question: "What is the capital of France?",
            options: ["London", "Paris", "Berlin", "Madrid"],
            answer: "Paris"
            },
            {
            question: "Which language is used for web development?",
            options: ["Python", "C++", "HTML", "Java"],
            answer: "HTML"
            },
            {
            question: "What does CSS stand for?",
            options: ["Cascading Style Sheets", "Computer Style System", "Creative Style Setup", "None"],
            answer: "Cascading Style Sheets"
            }
    ]
};

const categorySelect = document.getElementById('category-select');

function loadCategories() {
categorySelect.innerHTML = '';
for (let category in quizData) {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
    categorySelect.appendChild(option);
}
}

let questions = [];
let currentCategory = localStorage.getItem('quizCategory') || 'science';

function selectCategory(category) {
questions = quizData[category];
currentQuestionIndex = 0;
score = 0;
showQuestion();
}

// Event listener
categorySelect.addEventListener('change', () => {
currentCategory = categorySelect.value;
localStorage.setItem('quizCategory', currentCategory);
selectCategory(currentCategory);
});

// On page load
loadCategories();
categorySelect.value = currentCategory;
selectCategory(currentCategory);

let currentQuestionIndex = 0;
let score = 0;

const questionElement = document.getElementById('question');
const optionsElement = document.getElementById('options');
const nextButton = document.getElementById('next-btn');
const resultElement = document.getElementById('result');
const scoreElement = document.getElementById('score');
const restartButton = document.getElementById('restart-btn');
const toggleThemeButton = document.getElementById('toggle-theme');

  // Load theme from localStorage
if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark');
}

toggleThemeButton.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
});

function showQuestion() {
    const currentQuestion = questions[currentQuestionIndex];

    // Fade out animation
    questionElement.classList.add('fade-out');
    optionsElement.classList.add('fade-out');

    setTimeout(() => {
      // After fade out, change content
    questionElement.textContent = currentQuestion.question;
    optionsElement.innerHTML = '';

    currentQuestion.options.forEach(option => {
        const button = document.createElement('button');
        button.textContent = option;
        button.onclick = selectOption;
        optionsElement.appendChild(button);
    });

      // Fade in animation
    questionElement.classList.remove('fade-out');
    questionElement.classList.add('fade-in');

    optionsElement.classList.remove('fade-out');
    optionsElement.classList.add('fade-in');

      // Remove fade-in class after animation ends to allow re-trigger
    setTimeout(() => {
        questionElement.classList.remove('fade-in');
        optionsElement.classList.remove('fade-in');
    }, 500);

    }, 500); // Match the CSS fadeOut duration

    {
        clearInterval(timer); // Clear previous timer
        timeLeft = 20;
        document.getElementById('timer').textContent = `Time Left: ${timeLeft}s`;

        timer = setInterval(() => {
        timeLeft--;
        document.getElementById('timer').textContent = `Time Left: ${timeLeft}s`;
        if (timeLeft <= 0) {
            clearInterval(timer);
            handleTimeOut();
        }
        }, 1000);

        const question = questions[currentQuestionIndex];
        questionElement.textContent = question.question;

        optionsElement.innerHTML = '';
        question.options.forEach(option => {
        const button = document.createElement('button');
        button.textContent = option;
        button.addEventListener('click', selectAnswer);
        optionsElement.appendChild(button);
        });
    };
}

function selectOption(e) {
    const selectedOption = e.target.textContent;
    const correctAnswer = questions[currentQuestionIndex].answer;

    if (selectedOption === correctAnswer) {
    score++;
    }

    currentQuestionIndex++;

    if (currentQuestionIndex < questions.length) {
    showQuestion();
    } else {
    showResult();
    }
}

function showResult() {
    document.getElementById('quiz-container').classList.add('hidden');
    resultElement.classList.remove('hidden');
    scoreElement.textContent = `${score} / ${questions.length}`;

    saveScoreToHistory(score);
    loadHistory();

    if (score === questions.length) {
    startConfetti();
    }
}

function restartQuiz() {
    currentQuestionIndex = 0;
    score = 0;
    resultElement.classList.add('hidden');
    document.getElementById('quiz-container').classList.remove('hidden');
    showQuestion();
}

nextButton.addEventListener('click', () => {
    currentQuestionIndex++;
    if (currentQuestionIndex < questions.length) {
    showQuestion();
    } else {
    showResult();
    }
});

restartButton.addEventListener('click', restartQuiz);

  // Start the quiz
showQuestion();

function saveScoreToHistory(newScore) {
    let history = JSON.parse(localStorage.getItem('quizHistory')) || [];
    const timestamp = new Date().toLocaleString();
    history.push({ score: newScore, time: timestamp });
    localStorage.setItem('quizHistory', JSON.stringify(history));
}

function loadHistory() {
    const historyList = document.getElementById('history');
    historyList.innerHTML = '';

    const history = JSON.parse(localStorage.getItem('quizHistory')) || [];

    history.forEach((entry, index) => {
    const li = document.createElement('li');
    li.textContent = `${entry.score} / ${questions.length} - ${entry.time}`;
    li.classList.add('history-item');
      li.style.animationDelay = `${index * 0.1}s`; // Delay each item a bit
    historyList.appendChild(li);
    });
}

function clearHistory() {
    const clearHistoryButton = document.getElementById('clear-history-btn');
clearHistoryButton.addEventListener('click', clearHistory);

    localStorage.removeItem('quizHistory');
    loadHistory(); // Refresh list
}

function startConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    canvas.classList.remove('hidden');
    const ctx = canvas.getContext('2d');
    const pieces = [];

    for (let i = 0; i < 150; i++) {
    pieces.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 5 + 2,
        speedX: Math.random() * 3 - 1.5,
        speedY: Math.random() * 3 + 2,
        color: `hsl(${Math.random() * 360}, 70%, 60%)`
    });
    }

    function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.size *= 0.99; // slowly shrink
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    }

    function animate() {
    update();
    requestAnimationFrame(animate);
    }

    animate();

    // Stop confetti after 5 seconds
    setTimeout(() => {
    canvas.classList.add('hidden');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, 5000);
}

let timer;
let timeLeft = 20; // 20 seconds

function handleTimeOut() {
    alert("Time's up!");
    nextQuestion();
}
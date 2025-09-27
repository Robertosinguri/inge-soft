document.addEventListener("DOMContentLoaded", () => {
    let currentQuestion = 0;
    let score = 0;
    let questions = [];

    // 1. Elementos del DOM
    const quizSelectionEl = document.querySelector(".quiz-selection");
    const quizContainerEl = document.querySelector(".quiz-container");
    
    // Referencia al h1 para el título del cuestionario seleccionado
    const selectedQuizTitleEl = document.getElementById("selected-quiz-title"); 
    
    const questionEl = document.getElementById("question");
    const optionsEl = document.getElementById("options");
    const feedbackEl = document.getElementById("feedback");

    // Crear y adjuntar el botón de "Enviar respuesta" dinámicamente.
    const submitBtn = document.createElement("button");
    submitBtn.type = "button"; // ✅ FIX CLAVE 1: Evita el comportamiento de 'submit' por defecto.
    submitBtn.innerText = "Enviar respuesta";
    submitBtn.disabled = true;
    optionsEl.parentNode.appendChild(submitBtn);

    // =========================================================
    // FUNCIÓN: Mezclar Array (Algoritmo Fisher-Yates)
    // =========================================================
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // 2. Funciones de Carga y Lógica
    async function loadQuestions(fileName, expectedTitle) {
        try {
            const response = await fetch(fileName);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            if (data.titulo !== expectedTitle) {
                questionEl.innerText = `Error: el título esperado "${expectedTitle}" no coincide con "${data.titulo}".`;
                return [];
            }

            if (!Array.isArray(data.preguntas)) {
                questionEl.innerText = "Formato incorrecto: no se encontró la lista de preguntas.";
                return [];
            }

            return data.preguntas;
        } catch (error) {
            console.error("Error cargando las preguntas:", error);
            questionEl.innerText = "Error al cargar las preguntas.";
            return [];
        }
    }

    function showQuestion() {
        if (currentQuestion >= questions.length) {
            return;
        }

        const questionData = questions[currentQuestion];
        // Aquí solo se muestra la pregunta
        questionEl.innerText = `${currentQuestion + 1}. ${questionData.pregunta}`;

        optionsEl.innerHTML = "";
        feedbackEl.innerHTML = "";
        
        const optionsList = document.createElement("div");
        optionsEl.appendChild(optionsList); 

        const inputs = []; 

        Object.entries(questionData.opciones)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .forEach(([key, text]) => {
                const label = document.createElement("label");
                
                const input = document.createElement("input");
                input.type = "radio"; 
                input.value = key;
                input.name = "option";
                
                // Lógica: al seleccionar un radio, se habilita el botón Enviar.
                input.addEventListener("change", () => {
                    submitBtn.disabled = false;
                });

                inputs.push(input);

                const spanText = document.createElement("span");
                spanText.innerText = `${key}. ${text}`;

                label.appendChild(input);
                label.appendChild(spanText);
                optionsList.appendChild(label);
            });

        submitBtn.style.display = "block";
        submitBtn.disabled = true;

        submitBtn.onclick = (event) => {
            event.preventDefault(); // Detiene cualquier intento de recarga de la página (redundante, pero útil).

            // Utilizamos el array 'inputs' para encontrar la selección
            const selected = inputs.filter(inp => inp.checked).map(inp => inp.value);
            inputs.forEach(inp => (inp.disabled = true));
            submitBtn.style.display = "none";

            checkAnswer(selected);
        };
    }

    function createNextQuestionButton(text = "Siguiente Pregunta", action = nextQuestion, className = "next-btn") {
        const btn = document.createElement("button");
        btn.type = "button"; // ✅ FIX CLAVE 2: Evita el comportamiento de 'submit' en botones de navegación.
        btn.innerText = text;
        btn.classList.add(className); 
        
        btn.addEventListener("click", (event) => {
            event.preventDefault(); // Detiene cualquier intento de recarga de la página.
            action();
        });
        return btn;
    }

    function checkAnswer(selected) {
        const questionData = questions[currentQuestion];
        const correctAnswers = [...questionData.correctas].sort();
        const selectedSorted = [...selected].sort();

        const isCorrect =
            selectedSorted.length === correctAnswers.length &&
            selectedSorted.every((val, idx) => val === correctAnswers[idx]);

        feedbackEl.innerHTML = "";
        feedbackEl.classList.remove("correct", "incorrect");

        if (isCorrect) {
            score++;
            feedbackEl.innerHTML = "✅ Correcto";
            feedbackEl.classList.add("correct");
            
            feedbackEl.appendChild(createNextQuestionButton());

        } else {
            let explanationHtml = "";

            if (questionData.explicaciones_correctas) {
                const explanations = correctAnswers
                    .map(key => {
                        const optionText = questionData.opciones[key];
                        const explanation = questionData.explicaciones_correctas[key];
                        if (explanation) {
                            return `<strong>${key.toUpperCase()}. ${optionText}:</strong> ${explanation}`;
                        }
                        return null;
                    })
                    .filter(Boolean);

                if (explanations.length > 0) {
                    explanationHtml = `<div class="explanation-box">
                                <strong>Explicación(es):</strong><br>
                                ${explanations.join("<br>")}
                            </div>`;
                }
            }
            
            feedbackEl.innerHTML = `❌ Incorrecto. Correcta(s): ${correctAnswers.join(", ")}<br>${explanationHtml}`;
            feedbackEl.classList.add("incorrect");
            
            feedbackEl.appendChild(createNextQuestionButton());
        }
    }

    function nextQuestion() {
        currentQuestion++;
        if (currentQuestion < questions.length) {
            showQuestion();
        } else {
            // Lógica de Resultados Finales
            optionsEl.innerHTML = "";
            submitBtn.style.display = "none";
            
            // Limpiamos el título principal del quiz y mostramos el de resultados
            selectedQuizTitleEl.innerText = "";
            selectedQuizTitleEl.innerHTML = '<div class="results-title">Resultados Finales</div>';
            
            const totalQuestions = questions.length;
            const correctScore = score;
            const percentage = totalQuestions > 0 ? ((correctScore / totalQuestions) * 100).toFixed(0) : 0;
            const isPassing = percentage >= 60; 

            // Dejamos questionEl vacío o lo usamos para un mensaje
            questionEl.innerText = ''; 
            
            feedbackEl.innerHTML = `<p class="final-score ${isPassing ? 'pass' : 'fail'}">
                    ${correctScore} de ${totalQuestions} correctas (${percentage}%)
                </p>`;

            const volverBtn = createNextQuestionButton(
                "Seleccionar otro cuestionario",
                resetQuizState,
                "volver-btn" 
            );
            feedbackEl.appendChild(volverBtn);
        }
    }

    // 3. Funciones de Control y Eventos
    function resetQuizState() {
        quizContainerEl.style.display = "none";
        quizSelectionEl.style.display = "flex"; 
        
        currentQuestion = 0;
        score = 0;
        questions = [];
        
        // Limpiamos el título al volver a la pantalla de selección
        selectedQuizTitleEl.innerText = "";

        questionEl.innerText = "";
        optionsEl.innerHTML = "";
        feedbackEl.innerText = "";
        submitBtn.style.display = "none";
    }

    document.querySelectorAll(".quiz-btn").forEach((button) => {
        button.addEventListener("click", async (event) => {
            event.preventDefault(); // Detiene cualquier intento de recarga de la página.
            
            const selectedQuizName = button.innerText; 
            let fileName = "";
            let expectedTitle = "";

            // ✅ MEJORA DE RENDIMIENTO: Mostrar pantalla de quiz y mensaje de carga inmediatamente.
            selectedQuizTitleEl.innerText = selectedQuizName;
            quizSelectionEl.style.display = "none";
            quizContainerEl.style.display = "block";
            questionEl.innerText = "Cargando preguntas, por favor espere..."; 
            optionsEl.innerHTML = "";
            feedbackEl.innerHTML = "";
            submitBtn.style.display = "none";

            if (button.dataset.quiz === "0") {
                fileName = "01_unidad.json"; expectedTitle = "unidad 1";
            } else if (button.dataset.quiz === "1") {
                fileName = "02_unidad.json"; expectedTitle = "unidad 2";
            } else if (button.dataset.quiz === "2") {
                fileName = "03a_unidad.json"; expectedTitle = "unidad 3-A";
            } else if (button.dataset.quiz === "3") {
                fileName = "03b_unidad.json"; expectedTitle = "unidad 3-B";
            } else if (button.dataset.quiz === "4") {
                fileName = "04_unidad.json"; expectedTitle = "unidad 4";
            } else {
                console.error("Botón de cuestionario no reconocido:", button.dataset.quiz);
                questionEl.innerText = "Error: Cuestionario no encontrado.";
                return;
            }

            // Aquí ocurre la espera de la red (fetch)
            questions = await loadQuestions(fileName, expectedTitle);

            if (questions.length > 0) {
                shuffleArray(questions);
                showQuestion(); // Esto reemplaza el mensaje de carga con la primera pregunta.
            } else {
                // Si la carga falló, el mensaje de error de loadQuestions se mantiene en questionEl.
                submitBtn.style.display = "none";
            }
        });
    });
});
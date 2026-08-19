(() => {
  const bank = window.VOCAB_QUESTIONS || [];

  const $ = id => document.getElementById(id);

  const startScreen = $("startScreen");
  const quizScreen = $("quizScreen");
  const resultScreen = $("resultScreen");

  let selectedCategory = "전체";
  let selectedCount = 20;

  let questions = [];
  let currentIndex = 0;
  let answers = [];
  let answerChecked = false;

  function shuffle(array) {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
      const randomIndex = Math.floor(Math.random() * (i + 1));

      [result[i], result[randomIndex]] = [
        result[randomIndex],
        result[i]
      ];
    }

    return result;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function changeScreen(screenName) {
    startScreen.classList.toggle(
      "hidden",
      screenName !== "start"
    );

    quizScreen.classList.toggle(
      "hidden",
      screenName !== "quiz"
    );

    resultScreen.classList.toggle(
      "hidden",
      screenName !== "result"
    );
  }

  function makeQuestions(source) {
    return shuffle(source)
      .slice(0, Math.min(selectedCount, source.length))
      .map(question => {
        const wrongChoices = shuffle(
          bank.filter(item => {
            return (
              item.category === question.category &&
              item.term !== question.term
            );
          })
        )
          .slice(0, 3)
          .map(item => item.definition);

        return {
          ...question,

          choices: shuffle([
            question.definition,
            ...wrongChoices
          ])
        };
      });
  }

  function startQuiz(customSource) {
    let source;

    if (customSource) {
      source = customSource;
    } else if (selectedCategory === "전체") {
      source = bank;
    } else {
      source = bank.filter(item => {
        return item.category === selectedCategory;
      });
    }

    questions = makeQuestions(source);

    currentIndex = 0;
    answers = [];
    answerChecked = false;

    changeScreen("quiz");
    renderQuestion();
  }

  function renderQuestion() {
    const question = questions[currentIndex];

    $("progressBar").style.width =
      `${((currentIndex + 1) / questions.length) * 100}%`;

    $("questionCategory").textContent =
      question.category;

    $("currentNumber").textContent =
      currentIndex + 1;

    $("questionCount").textContent =
      questions.length;

    $("questionLabel").textContent =
      `QUESTION ${String(currentIndex + 1).padStart(2, "0")}`;

    $("questionText").textContent =
      `‘${question.term}’의 뜻으로 가장 알맞은 것은?`;

    $("choiceList").innerHTML = "";

    $("explanation").className =
      "explanation hidden";

    $("nextButton").classList.add("hidden");

    answerChecked = false;

    question.choices.forEach((choice, index) => {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "choice-button";

      const number = document.createElement("span");

      number.className = "choice-number";
      number.textContent = index + 1;

      const text = document.createElement("span");

      text.textContent = choice;

      button.append(number, text);

      button.addEventListener("click", () => {
        checkAnswer(choice, button);
      });

      $("choiceList").appendChild(button);
    });
  }

  function checkAnswer(selectedChoice, selectedButton) {
    if (answerChecked) {
      return;
    }

    answerChecked = true;

    const question = questions[currentIndex];
    const buttons =
      $("choiceList").querySelectorAll("button");

    answers[currentIndex] = selectedChoice;

    buttons.forEach(button => {
      const choiceText =
        button.lastElementChild.textContent;

      button.disabled = true;

      if (choiceText === question.definition) {
        button.classList.add("correct");
      } else if (button === selectedButton) {
        button.classList.add("wrong");
      }
    });

    const isCorrect =
      selectedChoice === question.definition;

    const explanation = $("explanation");

    explanation.className =
      `explanation ${isCorrect ? "correct" : "wrong"}`;

    explanation.innerHTML = `
      <strong class="answer-status">
        ${isCorrect ? "정답입니다!" : "오답입니다."}
      </strong>

      ${isCorrect ? "" : `
        <p class="correct-answer">
          정답: ${escapeHtml(question.definition)}
        </p>
      `}

      <div class="learning-note">
        <p class="learning-label">의미</p>
        <p class="learning-content">
          <b>${escapeHtml(question.term)}</b>
          — ${escapeHtml(question.definition)}
        </p>

        <p class="learning-label">예문</p>
        <p class="example-sentence">
          ${escapeHtml(question.example || "예문이 준비되지 않았습니다.")}
        </p>
      </div>
    `;

    $("nextButton").textContent =
      currentIndex === questions.length - 1
        ? "결과 확인 →"
        : "다음 문제 →";

    $("nextButton").classList.remove("hidden");
  }

  function showResult() {
    const correctCount = questions.filter(
      (question, index) => {
        return answers[index] === question.definition;
      }
    ).length;

    const score = Math.round(
      (correctCount / questions.length) * 100
    );

    $("scoreNumber").textContent = score;

    $("resultTitle").textContent =
      score >= 80
        ? "어휘력이 탄탄합니다."
        : score >= 60
          ? "조금만 더 복습하면 됩니다."
          : "오답부터 다시 풀어봅시다.";

    $("resultDescription").innerHTML =
      `${questions.length}문제 중
       <b>${correctCount}문제</b>를 맞혔습니다.`;

    $("wrongRetryButton").classList.toggle(
      "hidden",
      correctCount === questions.length
    );

    changeScreen("result");
  }

  document
    .querySelectorAll("#categoryButtons button")
    .forEach(button => {
      button.addEventListener("click", () => {
        selectedCategory = button.dataset.value;

        document
          .querySelectorAll("#categoryButtons button")
          .forEach(item => {
            item.classList.toggle(
              "selected",
              item === button
            );
          });
      });
    });

  document
    .querySelectorAll("#countButtons button")
    .forEach(button => {
      button.addEventListener("click", () => {
        selectedCount = Number(button.dataset.value);

        document
          .querySelectorAll("#countButtons button")
          .forEach(item => {
            item.classList.toggle(
              "selected",
              item === button
            );
          });
      });
    });

  $("startButton").addEventListener("click", () => {
    startQuiz();
  });

  $("nextButton").addEventListener("click", () => {
    if (currentIndex === questions.length - 1) {
      showResult();
      return;
    }

    currentIndex += 1;
    renderQuestion();
  });

  $("wrongRetryButton").addEventListener("click", () => {
    const wrongQuestions = questions.filter(
      (question, index) => {
        return answers[index] !== question.definition;
      }
    );

    selectedCount = wrongQuestions.length;

    startQuiz(wrongQuestions);
  });

  $("restartButton").addEventListener("click", () => {
    startQuiz();
  });

  $("homeButton").addEventListener("click", () => {
    changeScreen("start");
  });

  $("totalCount").textContent =
    `총 ${bank.length}문항`;
})();

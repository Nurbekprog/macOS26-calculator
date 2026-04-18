const display = document.getElementById("display");
const expression = document.getElementById("expression");
const buttons = document.querySelectorAll(".calc-btn");
const operatorButtons = document.querySelectorAll('[data-action="operator"]');

const locale = "uz-UZ";
const decimalSeparator =
  new Intl.NumberFormat(locale)
    .formatToParts(1.1)
    .find((part) => part.type === "decimal")?.value || ",";

const MAX_INPUT_LENGTH = 14;

const state = {
  displayValue: "0",
  storedValue: null,
  operator: null,
  lastRightOperand: null,
  waitingForOperand: false,
  justEvaluated: false,
  historyText: "",
};

function resetState() {
  state.displayValue = "0";
  state.storedValue = null;
  state.operator = null;
  state.lastRightOperand = null;
  state.waitingForOperand = false;
  state.justEvaluated = false;
  state.historyText = "";
}

function normalizeResult(value) {
  if (!Number.isFinite(value)) {
    return null;
  }

  return Number.parseFloat(value.toPrecision(12)).toString();
}

function formatDisplay(value) {
  if (value === "Error") {
    return value;
  }

  if (value.toLowerCase().includes("e")) {
    return value.replace(".", decimalSeparator);
  }

  const isNegative = value.startsWith("-");
  const absoluteValue = isNegative ? value.slice(1) : value;
  const hasDecimal = absoluteValue.includes(".");
  const [integerPart = "0", fractionPart = ""] = absoluteValue.split(".");
  const safeInteger = integerPart === "" ? "0" : integerPart;
  const formattedInteger = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(Number(safeInteger));

  if (!hasDecimal) {
    return `${isNegative ? "-" : ""}${formattedInteger}`;
  }

  return `${isNegative ? "-" : ""}${formattedInteger}${decimalSeparator}${fractionPart}`;
}

function updateOperatorHighlight() {
  operatorButtons.forEach((button) => {
    const isActive =
      state.operator === button.dataset.value &&
      state.waitingForOperand &&
      !state.justEvaluated;

    button.classList.toggle("is-active", isActive);
  });
}

function updateDisplay() {
  display.textContent = formatDisplay(state.displayValue);
  expression.textContent = state.historyText;
  updateOperatorHighlight();
}

function showError() {
  state.displayValue = "Error";
  state.storedValue = null;
  state.operator = null;
  state.lastRightOperand = null;
  state.waitingForOperand = false;
  state.justEvaluated = false;
  state.historyText = "Noto'g'ri amal";
  updateDisplay();
}

function prepareFreshInput() {
  state.displayValue = "0";
  state.storedValue = null;
  state.operator = null;
  state.lastRightOperand = null;
  state.waitingForOperand = false;
  state.justEvaluated = false;
  state.historyText = "";
}

function inputDigit(digit) {
  if (state.displayValue === "Error") {
    prepareFreshInput();
  }

  if (state.justEvaluated) {
    prepareFreshInput();
  }

  if (state.waitingForOperand) {
    state.displayValue = digit;
    state.waitingForOperand = false;
    updateDisplay();
    return;
  }

  const rawLength = state.displayValue.replace("-", "").replace(".", "").length;

  if (rawLength >= MAX_INPUT_LENGTH) {
    return;
  }

  state.displayValue =
    state.displayValue === "0" ? digit : `${state.displayValue}${digit}`;
  updateDisplay();
}

function inputDecimal() {
  if (state.displayValue === "Error") {
    prepareFreshInput();
  }

  if (state.justEvaluated) {
    prepareFreshInput();
  }

  if (state.waitingForOperand) {
    state.displayValue = "0.";
    state.waitingForOperand = false;
    updateDisplay();
    return;
  }

  if (!state.displayValue.includes(".")) {
    state.displayValue = `${state.displayValue}.`;
    updateDisplay();
  }
}

function clearAll() {
  resetState();
  updateDisplay();
}

function backspace() {
  if (state.displayValue === "Error") {
    clearAll();
    return;
  }

  if (state.waitingForOperand || state.justEvaluated) {
    return;
  }

  if (state.displayValue.length <= 1 || state.displayValue === "-0") {
    state.displayValue = "0";
  } else {
    state.displayValue = state.displayValue.slice(0, -1);
  }

  if (state.displayValue === "-" || state.displayValue === "") {
    state.displayValue = "0";
  }

  updateDisplay();
}

function toggleSign() {
  if (state.displayValue === "Error") {
    return;
  }

  if (state.displayValue === "0" || state.displayValue === "0.") {
    return;
  }

  state.displayValue = state.displayValue.startsWith("-")
    ? state.displayValue.slice(1)
    : `-${state.displayValue}`;

  updateDisplay();
}

function calculate(left, right, operator) {
  switch (operator) {
    case "+":
      return left + right;
    case "-":
      return left - right;
    case "*":
      return left * right;
    case "/":
      if (right === 0) {
        return null;
      }

      return left / right;
    default:
      return right;
  }
}

function operatorSymbol(operator) {
  if (operator === "*") {
    return "×";
  }

  if (operator === "/") {
    return "÷";
  }

  if (operator === "-") {
    return "−";
  }

  return operator;
}

function handlePercent() {
  if (state.displayValue === "Error") {
    return;
  }

  const currentValue = Number(state.displayValue);
  let result = currentValue / 100;

  if (
    state.operator &&
    state.storedValue !== null &&
    !state.waitingForOperand &&
    (state.operator === "+" || state.operator === "-")
  ) {
    result = (state.storedValue * currentValue) / 100;
  }

  const normalized = normalizeResult(result);

  if (!normalized) {
    showError();
    return;
  }

  state.displayValue = normalized;
  updateDisplay();
}

function chooseOperator(nextOperator) {
  if (state.displayValue === "Error") {
    return;
  }

  const inputValue = Number(state.displayValue);

  if (state.justEvaluated) {
    state.storedValue = inputValue;
    state.operator = nextOperator;
    state.waitingForOperand = true;
    state.justEvaluated = false;
    state.lastRightOperand = null;
    state.historyText = `${formatDisplay(state.displayValue)} ${operatorSymbol(nextOperator)}`;
    updateDisplay();
    return;
  }

  if (state.operator && state.waitingForOperand) {
    state.operator = nextOperator;
    state.historyText = `${formatDisplay(String(state.storedValue ?? inputValue))} ${operatorSymbol(nextOperator)}`;
    updateDisplay();
    return;
  }

  if (state.storedValue === null) {
    state.storedValue = inputValue;
  } else if (state.operator) {
    const result = calculate(state.storedValue, inputValue, state.operator);
    const normalized = normalizeResult(result);

    if (!normalized) {
      showError();
      return;
    }

    state.historyText = `${formatDisplay(String(state.storedValue))} ${operatorSymbol(state.operator)} ${formatDisplay(state.displayValue)}`;
    state.displayValue = normalized;
    state.storedValue = Number(normalized);
  }

  state.operator = nextOperator;
  state.waitingForOperand = true;
  state.lastRightOperand = null;
  state.historyText = `${formatDisplay(String(state.storedValue))} ${operatorSymbol(nextOperator)}`;
  updateDisplay();
}

function handleEquals() {
  if (state.displayValue === "Error" || state.operator === null || state.storedValue === null) {
    return;
  }

  let rightOperand;

  if (state.waitingForOperand) {
    rightOperand = state.lastRightOperand ?? state.storedValue;
  } else {
    rightOperand = Number(state.displayValue);
    state.lastRightOperand = rightOperand;
  }

  const leftOperand = state.storedValue;
  const result = calculate(leftOperand, rightOperand, state.operator);
  const normalized = normalizeResult(result);

  if (!normalized) {
    showError();
    return;
  }

  state.historyText = `${formatDisplay(String(leftOperand))} ${operatorSymbol(state.operator)} ${formatDisplay(String(rightOperand))} =`;
  state.displayValue = normalized;
  state.storedValue = Number(normalized);
  state.waitingForOperand = true;
  state.justEvaluated = true;
  updateDisplay();
}

function handleButtonPress(button) {
  const action = button.dataset.action;
  const value = button.dataset.value;

  switch (action) {
    case "digit":
      inputDigit(value);
      break;
    case "decimal":
      inputDecimal();
      break;
    case "clear":
      clearAll();
      break;
    case "backspace":
      backspace();
      break;
    case "sign":
      toggleSign();
      break;
    case "percent":
      handlePercent();
      break;
    case "operator":
      chooseOperator(value);
      break;
    case "equals":
      handleEquals();
      break;
    default:
      break;
  }
}

function animatePress(button) {
  button.classList.add("is-pressed");
  window.setTimeout(() => {
    button.classList.remove("is-pressed");
  }, 130);
}

buttons.forEach((button) => {
  button.addEventListener("click", () => {
    handleButtonPress(button);
  });
});

window.addEventListener("keydown", (event) => {
  const { key } = event;
  let targetButton = null;

  if (/^\d$/.test(key)) {
    inputDigit(key);
    targetButton = document.querySelector(`[data-action="digit"][data-value="${key}"]`);
  } else if (key === "." || key === ",") {
    inputDecimal();
    targetButton = document.querySelector('[data-action="decimal"]');
  } else if (key === "+" || key === "-") {
    chooseOperator(key);
    targetButton = document.querySelector(`[data-action="operator"][data-value="${key}"]`);
  } else if (key === "*" || key.toLowerCase() === "x") {
    chooseOperator("*");
    targetButton = document.querySelector('[data-action="operator"][data-value="*"]');
  } else if (key === "/") {
    chooseOperator("/");
    targetButton = document.querySelector('[data-action="operator"][data-value="/"]');
  } else if (key === "%" ) {
    handlePercent();
    targetButton = document.querySelector('[data-action="percent"]');
  } else if (key === "Enter" || key === "=") {
    handleEquals();
    targetButton = document.querySelector('[data-action="equals"]');
  } else if (key === "Backspace") {
    backspace();
    targetButton = document.querySelector('[data-action="backspace"]');
  } else if (key === "Escape" || key.toLowerCase() === "c") {
    clearAll();
    targetButton = document.querySelector('[data-action="clear"]');
  } else if (key === "F9") {
    toggleSign();
    targetButton = document.querySelector('[data-action="sign"]');
  }

  if (!targetButton) {
    return;
  }

  event.preventDefault();
  animatePress(targetButton);
});

updateDisplay();

const STORAGE_KEY = "todo-app-items";
const THEME_KEY = "todo-app-theme";

const form = document.querySelector("#todo-form");
const input = document.querySelector("#todo-input");
const list = document.querySelector("#todo-list");
const countLabel = document.querySelector("#todo-count");
const clearCompletedBtn = document.querySelector("#clear-completed");
const themeToggleBtn = document.querySelector("#theme-toggle");
const body = document.body;

let todos = loadTodos();
initTheme();

render();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  const newTodo = {
    id: crypto.randomUUID(),
    text,
    completed: false,
    createdAt: Date.now(),
  };

  todos = [...todos, newTodo];
  saveTodos();
  render({ highlightId: newTodo.id });
  form.reset();
  input.focus();
});

list.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const item = target.closest("[data-id]");
  if (!item) return;

  const { id } = item.dataset;

  if (target.matches("input[type='checkbox']")) {
    toggleTodo(id);
  } else if (target.matches("button.delete")) {
    deleteTodo(id);
  }
});

clearCompletedBtn.addEventListener("click", async () => {
  const completed = todos.filter((todo) => todo.completed).map((todo) => todo.id);
  if (!completed.length) return;

  await Promise.all(completed.map((id) => deleteTodo(id, { skipRender: true })));
  render();
});

themeToggleBtn?.addEventListener("click", () => {
  const current = body.dataset.theme === "dark" ? "dark" : "light";
  const next = current === "dark" ? "light" : "dark";
  setTheme(next);
});

function render(options = {}) {
  const { highlightId } = options;
  list.innerHTML = "";
  const fragment = document.createDocumentFragment();

  todos
    .slice()
    .sort((a, b) => a.createdAt - b.createdAt)
    .forEach((todo) => {
      const li = document.createElement("li");
      li.className = `todo-item${todo.completed ? " completed" : ""}`;
      li.dataset.id = todo.id;

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = todo.completed;
      checkbox.setAttribute("aria-label", "Toggle todo");

      const textSpan = document.createElement("span");
      textSpan.className = "todo-text";
      textSpan.textContent = todo.text;

      const actions = document.createElement("div");
      actions.className = "todo-actions";

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "delete";
      deleteBtn.textContent = "Xóa";
      actions.appendChild(deleteBtn);

      li.append(checkbox, textSpan, actions);
      fragment.appendChild(li);

      if (highlightId && todo.id === highlightId) {
        requestAnimationFrame(() => {
          li.classList.add("enter");
          li.addEventListener(
            "animationend",
            () => li.classList.remove("enter"),
            { once: true },
          );
        });
      }
    });

  list.appendChild(fragment);
  updateCount();
}

function toggleTodo(id) {
  todos = todos.map((todo) =>
    todo.id === id ? { ...todo, completed: !todo.completed } : todo,
  );
  saveTodos();
  render();
}

function deleteTodo(id, options = {}) {
  const { skipRender = false } = options;

  return new Promise((resolve) => {
    const element = list.querySelector(`[data-id="${id}"]`);

    const finalize = () => {
      todos = todos.filter((todo) => todo.id !== id);
      saveTodos();
      updateCount();
      if (!skipRender) {
        render();
      } else if (element?.isConnected) {
        element.remove();
      }
      resolve();
    };

    if (element) {
      element.classList.add("removing");
      element.addEventListener(
        "animationend",
        () => {
          element.remove();
          finalize();
        },
        { once: true },
      );
    } else {
      finalize();
    }
  });
}

function updateCount() {
  const remaining = todos.filter((todo) => !todo.completed).length;
  countLabel.textContent =
    remaining === 0
      ? "Không còn việc nào"
      : `${remaining} việc còn lại`;
}

function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("Không thể đọc localStorage", error);
    return [];
  }
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
  const initial = saved || (prefersDark ? "dark" : "light");
  setTheme(initial);
}

function setTheme(theme) {
  const normalized = theme === "dark" ? "dark" : "light";
  body.dataset.theme = normalized;
  themeToggleBtn?.setAttribute("aria-pressed", String(normalized === "dark"));
  document.documentElement.style.colorScheme = normalized;
  localStorage.setItem(THEME_KEY, normalized);
}

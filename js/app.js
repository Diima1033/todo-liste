'use strict';

// ── State ────────────────────────────────────────────────────────────────────
let todos         = [];
let currentFilter = 'all';

// ── Helpers ──────────────────────────────────────────────────────────────────
function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function getFiltered(todos, filter) {
  switch (filter) {
    case 'active': return todos.filter(t => !t.completed);
    case 'done':   return todos.filter(t => t.completed);
    default:       return todos;
  }
}

// ── Render ───────────────────────────────────────────────────────────────────
function render() {
  const filtered = getFiltered(todos, currentFilter);
  UI.renderList(filtered, todos, handlers);
  UI.updateFooter(todos, currentFilter);
  UI.updateToggleAll(todos);
}

// ── Handlers ─────────────────────────────────────────────────────────────────
function handleAdd(text, dueDate, assignee) {
  const trimmed = text.trim();
  if (!trimmed) return;
  todos.push({
    id:        generateId(),
    text:      trimmed,
    completed: false,
    dueDate:   dueDate || null,
    assignee:  assignee || null,
    createdAt: Date.now(),
  });
  Store.save(todos);
  render();
}

function handleSetAssignee(id, name) {
  todos = todos.map(t =>
    t.id === id ? { ...t, assignee: name || null } : t
  );
  Store.save(todos);
  render();
}

function handleSetDueDate(id, dueDate) {
  todos = todos.map(t =>
    t.id === id ? { ...t, dueDate: dueDate || null } : t
  );
  Store.save(todos);
  render();
}

function handleDelete(id) {
  todos = todos.filter(t => t.id !== id);
  Store.save(todos);
  render();
}

function handleToggle(id) {
  todos = todos.map(t =>
    t.id === id ? { ...t, completed: !t.completed } : t
  );
  Store.save(todos);
  render();
}

function handleToggleAll() {
  const allDone = todos.every(t => t.completed);
  todos = todos.map(t => ({ ...t, completed: !allDone }));
  Store.save(todos);
  render();
}

function handleFilter(filter) {
  currentFilter = filter;
  render();
}

function handleClearCompleted() {
  todos = todos.filter(t => !t.completed);
  Store.save(todos);
  render();
}

function handleEdit(id, newText) {
  const trimmed = newText.trim();
  if (!trimmed) {
    handleDelete(id);
    return;
  }
  todos = todos.map(t =>
    t.id === id ? { ...t, text: trimmed } : t
  );
  Store.save(todos);
  render();
}

function handleReorder(srcId, targetId) {
  const srcIndex    = todos.findIndex(t => t.id === srcId);
  const targetIndex = todos.findIndex(t => t.id === targetId);
  if (srcIndex === -1 || targetIndex === -1) return;

  const [moved] = todos.splice(srcIndex, 1);
  todos.splice(targetIndex, 0, moved);
  Store.save(todos);
  render();
}

// ── Handlers object passed to UI ─────────────────────────────────────────────
const handlers = {
  onAdd:            handleAdd,
  onDelete:         handleDelete,
  onToggle:         handleToggle,
  onToggleAll:      handleToggleAll,
  onFilter:         handleFilter,
  onClearCompleted: handleClearCompleted,
  onEdit:           handleEdit,
  onReorder:        handleReorder,
  onSetDueDate:     handleSetDueDate,
  onSetAssignee:    handleSetAssignee,
};

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  todos = Store.load();
  UI.bindEvents(handlers);
  render();
});

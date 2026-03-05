'use strict';

const UI = (() => {
  // ── DOM References ──────────────────────────────────────────────
  const appEl          = document.getElementById('app');
  const newTodoInput        = document.getElementById('newTodoInput');
  const newTodoDueInput     = document.getElementById('newTodoDue');
  const newTodoAssigneeInput= document.getElementById('newTodoAssignee');
  const todoListEl     = document.getElementById('todoList');
  const itemCountEl    = document.getElementById('itemCount');
  const toggleAllBtn   = document.getElementById('toggleAll');
  const clearCompBtn   = document.getElementById('clearCompleted');
  const filterBtns     = document.querySelectorAll('.filter-btn');

  // ── Drag State ──────────────────────────────────────────────────
  let dragSrcId = null;

  // ── Helpers ─────────────────────────────────────────────────────
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function todayStr() {
    return new Date().toISOString().split('T')[0];
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}.${m}.${y}`;
  }

  function getDueDateClass(dueDate) {
    if (!dueDate) return '';
    const today = todayStr();
    if (dueDate < today)  return 'todo-item__due--overdue';
    if (dueDate === today) return 'todo-item__due--today';
    return 'todo-item__due--future';
  }

  function getDueDateLabel(dueDate) {
    if (!dueDate) return '';
    const today = todayStr();
    if (dueDate < today)  return `⚠ ${formatDate(dueDate)}`;
    if (dueDate === today) return `⏰ Heute`;
    return `📅 ${formatDate(dueDate)}`;
  }

  function createItemEl(todo, handlers) {
    const li = document.createElement('li');
    li.className = 'todo-item' + (todo.completed ? ' todo-item--done' : '');
    li.dataset.id = todo.id;
    li.draggable = true;

    // Checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'todo-item__checkbox';
    checkbox.checked = todo.completed;
    checkbox.setAttribute('aria-label', 'Aufgabe abhaken');
    checkbox.addEventListener('change', () => handlers.onToggle(todo.id));

    // Text wrapper (label + due date)
    const textWrap = document.createElement('div');
    textWrap.className = 'todo-item__text-wrap';

    // Label
    const label = document.createElement('label');
    label.className = 'todo-item__label';
    label.textContent = todo.text;
    label.addEventListener('dblclick', () => startEditing(li, editInput));

    textWrap.appendChild(label);

    // Due date badge + hidden date picker
    if (todo.dueDate || true) {
      const dateInput = document.createElement('input');
      dateInput.type = 'date';
      dateInput.className = 'todo-item__date-input';
      dateInput.value = todo.dueDate || '';
      dateInput.addEventListener('change', () => {
        handlers.onSetDueDate(todo.id, dateInput.value || null);
      });

      const dueBadge = document.createElement('span');
      if (todo.dueDate) {
        dueBadge.className = 'todo-item__due ' + getDueDateClass(todo.dueDate);
        dueBadge.textContent = getDueDateLabel(todo.dueDate);
        dueBadge.title = 'Klicken zum Ändern';
      } else {
        dueBadge.className = 'todo-item__due';
        dueBadge.textContent = '+ Datum';
        dueBadge.style.opacity = '0';
      }

      dueBadge.addEventListener('click', () => {
        try { dateInput.showPicker(); } catch { dateInput.click(); }
      });

      textWrap.appendChild(dueBadge);
      li.appendChild(dateInput);

      // Show "+ Datum" on hover when no date is set
      if (!todo.dueDate) {
        li.addEventListener('mouseenter', () => { dueBadge.style.opacity = '0.5'; });
        li.addEventListener('mouseleave', () => { dueBadge.style.opacity = '0'; });
      }
    }

    // Assignee badge + inline edit
    const assigneeBadge = document.createElement('span');
    const assigneeInput = document.createElement('input');
    assigneeInput.type = 'text';
    assigneeInput.className = 'todo-item__assignee-input';
    assigneeInput.value = todo.assignee || '';
    assigneeInput.placeholder = 'Name eingeben…';
    assigneeInput.maxLength = 40;
    assigneeInput.setAttribute('aria-label', 'Zuständige Person');

    if (todo.assignee) {
      assigneeBadge.className = 'todo-item__assignee';
      assigneeBadge.textContent = '👤 ' + todo.assignee;
      assigneeBadge.title = 'Klicken zum Ändern';
    } else {
      assigneeBadge.className = 'todo-item__assignee todo-item__assignee--empty';
      assigneeBadge.textContent = '+ Person';
      assigneeBadge.style.opacity = '0';
      li.addEventListener('mouseenter', () => { assigneeBadge.style.opacity = '0.5'; });
      li.addEventListener('mouseleave', () => { assigneeBadge.style.opacity = '0'; });
    }

    let assigneeEditing = false;

    assigneeBadge.addEventListener('click', () => {
      assigneeEditing = true;
      assigneeBadge.style.display = 'none';
      assigneeInput.style.display = 'inline-block';
      assigneeInput.focus();
      assigneeInput.select();
    });

    function commitAssignee() {
      if (!assigneeEditing) return;
      assigneeEditing = false;
      const name = assigneeInput.value.trim();
      assigneeInput.style.display = 'none';
      assigneeBadge.style.display = '';
      handlers.onSetAssignee(todo.id, name || null);
    }

    assigneeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); commitAssignee(); }
      else if (e.key === 'Escape') {
        assigneeEditing = false;
        assigneeInput.value = todo.assignee || '';
        assigneeInput.style.display = 'none';
        assigneeBadge.style.display = '';
      }
    });
    assigneeInput.addEventListener('blur', commitAssignee);

    textWrap.appendChild(assigneeBadge);
    textWrap.appendChild(assigneeInput);

    // Edit input (text)
    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.className = 'todo-item__edit';
    editInput.value = todo.text;
    editInput.setAttribute('aria-label', 'Aufgabe bearbeiten');

    editInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitEdit(li, editInput, todo.id, handlers);
      } else if (e.key === 'Escape') {
        cancelEdit(li, editInput, todo.text);
      }
    });

    editInput.addEventListener('blur', () => {
      if (li.classList.contains('todo-item--editing')) {
        commitEdit(li, editInput, todo.id, handlers);
      }
    });

    // Delete button
    const delBtn = document.createElement('button');
    delBtn.className = 'todo-item__delete';
    delBtn.setAttribute('aria-label', 'Aufgabe löschen');
    delBtn.textContent = '×';
    delBtn.addEventListener('click', () => handlers.onDelete(todo.id));

    // Drag & Drop
    li.addEventListener('dragstart', (e) => {
      dragSrcId = todo.id;
      li.classList.add('todo-item--dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    li.addEventListener('dragend', () => {
      li.classList.remove('todo-item--dragging');
      todoListEl.querySelectorAll('.todo-item--drag-over').forEach(el => {
        el.classList.remove('todo-item--drag-over');
      });
    });

    li.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (todo.id !== dragSrcId) {
        todoListEl.querySelectorAll('.todo-item--drag-over').forEach(el => {
          el.classList.remove('todo-item--drag-over');
        });
        li.classList.add('todo-item--drag-over');
      }
    });

    li.addEventListener('drop', (e) => {
      e.preventDefault();
      li.classList.remove('todo-item--drag-over');
      if (dragSrcId && dragSrcId !== todo.id) {
        handlers.onReorder(dragSrcId, todo.id);
      }
    });

    li.append(checkbox, textWrap, editInput, delBtn);
    return li;
  }

  function startEditing(li, editInput) {
    li.classList.add('todo-item--editing');
    editInput.focus();
    editInput.select();
  }

  function commitEdit(li, editInput, id, handlers) {
    const newText = editInput.value.trim();
    li.classList.remove('todo-item--editing');
    if (newText) {
      handlers.onEdit(id, newText);
    } else {
      handlers.onDelete(id);
    }
  }

  function cancelEdit(li, editInput, originalText) {
    li.classList.remove('todo-item--editing');
    editInput.value = originalText;
  }

  // ── Public API ───────────────────────────────────────────────────

  function renderList(filteredTodos, allTodos, handlers) {
    todoListEl.innerHTML = '';
    filteredTodos.forEach(todo => {
      todoListEl.appendChild(createItemEl(todo, handlers));
    });
  }

  function updateFooter(todos, currentFilter) {
    const activeCount = todos.filter(t => !t.completed).length;
    const hasCompleted = todos.some(t => t.completed);

    itemCountEl.textContent = activeCount === 1
      ? '1 Aufgabe übrig'
      : `${activeCount} Aufgaben übrig`;

    filterBtns.forEach(btn => {
      const isActive = btn.dataset.filter === currentFilter;
      btn.classList.toggle('filter-btn--active', isActive);
      btn.setAttribute('aria-selected', String(isActive));
    });

    clearCompBtn.classList.toggle('hidden', !hasCompleted);
    appEl.classList.toggle('app--has-items', todos.length > 0);
  }

  function updateToggleAll(todos) {
    const allDone = todos.length > 0 && todos.every(t => t.completed);
    toggleAllBtn.classList.toggle('all-done', allDone);
    toggleAllBtn.setAttribute('aria-pressed', String(allDone));
  }

  function bindEvents(handlers) {
    function submitNewTodo() {
      handlers.onAdd(
        newTodoInput.value,
        newTodoDueInput.value || null,
        newTodoAssigneeInput.value.trim() || null
      );
      newTodoInput.value = '';
      newTodoDueInput.value = '';
      newTodoAssigneeInput.value = '';
    }

    newTodoInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        submitNewTodo();
      } else if (e.key === 'Escape') {
        newTodoInput.value = '';
        newTodoDueInput.value = '';
        newTodoAssigneeInput.value = '';
      }
    });

    newTodoAssigneeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && newTodoInput.value.trim()) {
        submitNewTodo();
      }
    });

    toggleAllBtn.addEventListener('click', handlers.onToggleAll);

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => handlers.onFilter(btn.dataset.filter));
    });

    clearCompBtn.addEventListener('click', handlers.onClearCompleted);

    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        newTodoInput.focus();
      }
    });
  }

  return { renderList, updateFooter, updateToggleAll, bindEvents };
})();

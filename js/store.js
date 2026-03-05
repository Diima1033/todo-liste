'use strict';

const Store = (() => {
  const KEY = 'todo-liste-v1';

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '[]');
    } catch {
      return [];
    }
  }

  function save(todos) {
    localStorage.setItem(KEY, JSON.stringify(todos));
  }

  return { load, save };
})();

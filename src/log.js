import { $ } from './util.js';

// city-log style feed in the bottom-left corner
export function pushLog(tag, text) {
  const li = document.createElement('li');
  li.innerHTML = `<em>${tag}</em>${text}`;
  const ul = $('#logList');
  ul.prepend(li);
  while (ul.children.length > 5) ul.lastChild.remove();
}

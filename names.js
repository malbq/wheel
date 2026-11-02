// Names live in a plain textarea, one per line. A line starting with `//` is
// disabled (the UI calls it "removed"): it stays in the list but isn't on the wheel. Textareas can't style
// parts of their text, so the textarea's own text is transparent and a backdrop
// behind it mirrors the same lines with styling. A gutter beside it holds toggles.

const MARKER = /^(\s*\/\/\s?)(.*)$/;

export const parseLine = (text) => {
  const match = text.match(MARKER);
  return {
    text,
    name: (match ? match[2] : text).trim(),
    enabled: !match,
    marker: match?.[1] ?? '',
  };
};

export const formatLine = (name, enabled) => (enabled ? name : `// ${name}`);

const lineStart = (lines, index) => lines.slice(0, index).reduce((sum, line) => sum + line.length + 1, 0);

const lineAt = (text, offset) => text.slice(0, offset).split('\n').length - 1;

export const createNamesEditor = ({ textarea, backdrop, gutter, colorOf, onInput }) => {
  let lines = [];

  const span = (className, text) => {
    const element = document.createElement('span');
    element.className = className;
    element.textContent = text;
    return element;
  };

  const syncScroll = () => {
    backdrop.style.transform = `translate(${-textarea.scrollLeft}px, ${-textarea.scrollTop}px)`;
    gutter.style.transform = `translateY(${-textarea.scrollTop}px)`;
  };

  // Grow with the content; CSS min/max-height clamp it. Collapsing to 0 first
  // lets scrollHeight shrink too. The offset/client difference covers a
  // horizontal scrollbar, which would otherwise hide the last line.
  const fitHeight = () => {
    const { scrollTop } = textarea;
    textarea.style.height = '0';
    textarea.style.height = `${textarea.scrollHeight + textarea.offsetHeight - textarea.clientHeight}px`;
    textarea.scrollTop = scrollTop;
  };

  const render = () => {
    fitHeight();
    lines = textarea.value.split('\n').map(parseLine);
    // Colors follow position among all named lines, removed ones included, so
    // removing or restoring a name never recolors the others
    const namedCount = lines.filter((line) => line.name).length;
    let namedIndex = 0;

    backdrop.replaceChildren(...lines.map((line) => {
      const row = document.createElement('div');
      row.className = 'line';
      if (line.name && !line.enabled) {
        row.append(span('marker', line.marker), span('off', line.text.slice(line.marker.length)));
      } else {
        row.textContent = line.text;
      }
      return row;
    }));

    gutter.replaceChildren(...lines.map((line, index) => {
      const row = document.createElement('div');
      row.className = 'line';
      if (!line.name) return row;

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.tabIndex = -1; // keyboard users have Ctrl+/
      toggle.dataset.line = index;
      toggle.setAttribute('aria-pressed', String(line.enabled));
      toggle.title = `${line.enabled ? 'Remove' : 'Restore'} ${line.name}`;
      const color = colorOf(namedIndex++, namedCount);
      if (line.enabled) toggle.style.setProperty('--dot', color);
      row.append(toggle);
      return row;
    }));

    syncScroll();
  };

  // Replace lines [from, to] through execCommand so the change lands in the
  // textarea's native undo history. Returns the inserted range.
  const replaceLines = (from, to, replacement) => {
    const all = textarea.value.split('\n');
    const start = lineStart(all, from);
    const end = lineStart(all, to) + all[to].length;
    const text = replacement.join('\n');
    const previous = document.activeElement;
    const { scrollTop, scrollLeft } = textarea;

    textarea.focus({ preventScroll: true });
    textarea.setSelectionRange(start, end);
    if (!document.execCommand('insertText', false, text)) {
      textarea.setRangeText(text, start, end, 'end');
      textarea.dispatchEvent(new Event('input'));
    }
    textarea.scrollTop = scrollTop;
    textarea.scrollLeft = scrollLeft;

    if (previous !== textarea) {
      if (previous && previous !== document.body) previous.focus({ preventScroll: true });
      else textarea.blur();
    }
    return { start, end: start + text.length };
  };

  const setEnabled = (from, to, enabled) => {
    const range = textarea.value.split('\n').slice(from, to + 1).map(parseLine);
    return replaceLines(from, to, range.map((line) => (line.name ? formatLine(line.name, enabled) : line.text)));
  };

  // Like "toggle comment" in code editors: if any named line in the range is
  // enabled, disable them all; otherwise enable them all.
  const toggle = (from, to) => {
    const named = lines.slice(from, to + 1).filter((line) => line.name);
    if (!named.length) return null;
    return setEnabled(from, to, named.every((line) => !line.enabled));
  };

  const toggleSelection = () => {
    const { selectionStart, selectionEnd, value } = textarea;
    const from = lineAt(value, selectionStart);
    let to = lineAt(value, selectionEnd);
    // A selection ending at the very start of a line doesn't include that line
    if (to > from && value[selectionEnd - 1] === '\n') to--;

    const before = value.split('\n')[from].length;
    const range = toggle(from, to);
    if (!range) return;

    if (selectionStart === selectionEnd) {
      const delta = textarea.value.split('\n')[from].length - before;
      const caret = Math.max(range.start, selectionStart + delta);
      textarea.setSelectionRange(caret, caret);
    } else {
      textarea.setSelectionRange(range.start, range.end);
    }
  };

  const setLines = (texts) => {
    const count = textarea.value.split('\n').length;
    replaceLines(0, count - 1, texts);
  };

  textarea.addEventListener('input', () => {
    render();
    onInput();
  });
  textarea.addEventListener('scroll', syncScroll);
  textarea.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && (event.key === '/' || event.code === 'Slash')) {
      event.preventDefault();
      toggleSelection();
    }
  });

  // Don't let gutter clicks steal focus or move the caret
  gutter.addEventListener('pointerdown', (event) => event.preventDefault());
  gutter.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-line]');
    if (button) toggle(Number(button.dataset.line), Number(button.dataset.line));
  });

  return {
    get lines() {
      return lines;
    },
    render,
    setEnabled,
    setLines,
  };
};

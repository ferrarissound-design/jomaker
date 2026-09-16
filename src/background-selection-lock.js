// Temporary background selection lock.
// Keep existing saved stages compatible, but prevent choosing unfinished themes in the editor.
const BLOCKED_BACKGROUND_IDS = new Set(['sunsetCoast', 'classic']);

function lockBackgroundOptions(root = document) {
  const selects = [];
  if (root instanceof HTMLSelectElement && (root.id === 'background' || root.name === 'background')) {
    selects.push(root);
  }
  if (root.querySelectorAll) {
    selects.push(...root.querySelectorAll('select#background, select[name="background"]'));
  }

  for (const select of selects) {
    for (const option of select.options) {
      if (!BLOCKED_BACKGROUND_IDS.has(option.value)) continue;
      option.disabled = true;
      option.dataset.temporarilyDisabled = 'true';
      if (!option.textContent.includes('準備中')) option.textContent = `${option.textContent}（準備中）`;
    }
  }
}

lockBackgroundOptions();

const observer = new MutationObserver(records => {
  for (const record of records) {
    for (const node of record.addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) lockBackgroundOptions(node);
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });

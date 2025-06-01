function simpleMarkdownToHTML(md) {
  const escapeHTML = str => str.replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[m]);

  const lines = md.split('\n');

  let html = '';
  let inList = false;
  let firstMajorFound = false;

  for (let line of lines) {
    line = line.trim();

    if (!line) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      continue;
    }

    if (line.startsWith('# ')) {
      if (inList) { html += '</ul>'; inList = false; }
      // Add <hr> before every major header except the first one
      if (firstMajorFound) html += '<hr>';
      else firstMajorFound = true;

      html += `<h1>${escapeHTML(line.slice(2))}</h1>`;
    } else if (line.startsWith('## ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h2>${escapeHTML(line.slice(3))}</h2>`;
    } else if (line.startsWith('### ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h3>${escapeHTML(line.slice(4))}</h3>`;
    } else if (line.startsWith('- ')) {
      if (!inList) {
        inList = true;
        html += '<ul>';
      }
      html += `<li>${escapeHTML(line.slice(2))}</li>`;
    } else {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<p>${escapeHTML(line)}</p>`;
    }
  }

  if (inList) html += '</ul>';

  return html;
}

function renderMarkdown() {
  const mdElement = document.getElementById('markdown-content');
  const outputElement = document.getElementById('output');
  if (!mdElement || !outputElement) {
    console.warn('Markdown or output element not found');
    return;
  }

  const md = mdElement.innerText;
  const html = simpleMarkdownToHTML(md);
  outputElement.innerHTML = html;

  // Remove the markdown source container after rendering
  mdElement.remove();
}

renderMarkdown();
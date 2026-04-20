// Generated runtime fallback for fresh checkouts.
// Source-of-truth Coconut UI implementation lives in `src-haxe/**`.
import '/src/styles/app.css';

const root = document.getElementById('app');

if (!root) {
  throw new Error('Missing #app mount node');
}

const state = {
  sessionId: '',
  filePath: '',
  pageCount: 0,
  pageOrder: [],
  selectedIndex: 0,
  annotations: [],
  status: 'Open a PDF to start.'
};

root.innerHTML = `
  <div class="app-shell">
    <aside class="panel">
      <h1>PDF Editor MVP (Windows)</h1>
      <p class="small">Tauri + Haxe + Coconut workflow shell for open/view/annotate/reorder/export.</p>

      <section>
        <h2>1) Open &amp; view</h2>
        <div class="controls">
          <button class="primary" id="open-btn">Open local PDF</button>
        </div>
        <p class="small" id="file-path-label">Current file: (none)</p>
      </section>

      <section>
        <h2>2) Annotate</h2>
        <div class="controls">
          <button data-tool="highlight">Highlight</button>
          <button data-tool="text-note">Text note</button>
          <button data-tool="rectangle">Rectangle</button>
          <button data-tool="underline">Underline</button>
        </div>
        <ul id="annotations-list"></ul>
      </section>

      <section>
        <h2>3) Reorder pages</h2>
        <p class="small">Select a page then move it.</p>
        <ol id="page-order-list"></ol>
        <div class="controls">
          <button id="move-up-btn">Move up</button>
          <button id="move-down-btn">Move down</button>
        </div>
      </section>

      <section>
        <h2>4) Export</h2>
        <button class="primary" id="export-btn">Export as new PDF file</button>
        <p class="small">MVP exports a copied PDF plus workflow metadata sidecar JSON.</p>
      </section>

      <p class="status" id="status-label"></p>
    </aside>

    <main class="workspace">
      <div id="pdf-page-container"></div>
    </main>
  </div>
`;

const filePathLabel = document.getElementById('file-path-label');
const annotationsList = document.getElementById('annotations-list');
const pageOrderList = document.getElementById('page-order-list');
const statusLabel = document.getElementById('status-label');

function setStatus(message) {
  state.status = message;
  if (statusLabel) {
    statusLabel.textContent = state.status;
  }
}

function renderState() {
  if (filePathLabel) {
    filePathLabel.textContent = `Current file: ${state.filePath || '(none)'}`;
  }

  if (annotationsList) {
    annotationsList.replaceChildren();
    for (const item of state.annotations) {
      const li = document.createElement('li');
      li.textContent = `Page ${item.page}: ${item.tool} - ${item.text}`;
      annotationsList.appendChild(li);
    }
  }

  if (pageOrderList) {
    pageOrderList.replaceChildren();
    state.pageOrder.forEach((page, index) => {
      const li = document.createElement('li');
      const button = document.createElement('button');
      button.textContent = `${state.selectedIndex === index ? '▶ ' : ''}Page ${page}`;
      button.addEventListener('click', () => {
        state.selectedIndex = index;
        renderState();
      });
      li.appendChild(button);
      pageOrderList.appendChild(li);
    });
  }

  if (statusLabel) {
    statusLabel.textContent = state.status;
  }
}

async function openPdfWorkflow() {
  try {
    const path = await window.PdfEditorBridge?.openFileDialog();
    if (!path) {
      setStatus('Open cancelled.');
      return;
    }

    const info = await window.PdfEditorBridge.openPdf(path);
    state.sessionId = info.sessionId;
    state.filePath = info.filePath;
    state.pageCount = info.pageCount;
    state.pageOrder = [...info.pageOrder];
    state.selectedIndex = 0;
    state.annotations = [];
    setStatus(`Opened ${info.filePath} (${info.pageCount} pages).`);
    renderState();
    await window.PdfEditorBridge.renderPdf(state.filePath, state.pageOrder);
  } catch (error) {
    setStatus(`Failed to open PDF: ${String(error)}`);
  }
}

async function addAnnotation(tool) {
  if (!state.sessionId) {
    setStatus('Open a PDF first.');
    return;
  }

  const pageInput = window.prompt('Page number', '1');
  const textInput = window.prompt('Annotation text', '');
  if (pageInput == null || textInput == null) {
    return;
  }

  const page = Number.parseInt(pageInput, 10);
  if (!Number.isFinite(page) || page < 1 || page > state.pageCount) {
    setStatus('Invalid page number.');
    return;
  }

  const annotation = { page, tool, text: textInput };

  try {
    await window.PdfEditorBridge.addAnnotation(state.sessionId, annotation);
    state.annotations.push(annotation);
    setStatus(`Added ${tool} annotation on page ${page}.`);
    renderState();
  } catch (error) {
    setStatus(`Unable to add annotation: ${String(error)}`);
  }
}

async function moveSelected(delta) {
  if (!state.sessionId || state.pageOrder.length === 0) {
    return;
  }

  const current = state.selectedIndex;
  const target = current + delta;
  if (target < 0 || target >= state.pageOrder.length) {
    return;
  }

  const updated = [...state.pageOrder];
  [updated[current], updated[target]] = [updated[target], updated[current]];

  try {
    state.pageOrder = await window.PdfEditorBridge.updatePageOrder(state.sessionId, updated);
    state.selectedIndex = target;
    setStatus('Saved page order.');
    renderState();
    await window.PdfEditorBridge.renderPdf(state.filePath, state.pageOrder);
  } catch (error) {
    setStatus(`Unable to reorder pages: ${String(error)}`);
  }
}

async function exportWorkflow() {
  if (!state.sessionId) {
    setStatus('Open a PDF first.');
    return;
  }

  try {
    const outputPath = await window.PdfEditorBridge.saveFileDialog();
    if (!outputPath) {
      setStatus('Export cancelled.');
      return;
    }

    const result = await window.PdfEditorBridge.exportSession(state.sessionId, outputPath);
    setStatus(`Exported PDF copy to ${result.outputPath}. Metadata saved to ${result.metadataPath}.`);
  } catch (error) {
    setStatus(`Export failed: ${String(error)}`);
  }
}

document.getElementById('open-btn')?.addEventListener('click', openPdfWorkflow);
document.getElementById('move-up-btn')?.addEventListener('click', () => moveSelected(-1));
document.getElementById('move-down-btn')?.addEventListener('click', () => moveSelected(1));
document.getElementById('export-btn')?.addEventListener('click', exportWorkflow);

for (const button of document.querySelectorAll('[data-tool]')) {
  button.addEventListener('click', () => {
    const tool = button.getAttribute('data-tool');
    if (tool) {
      addAnnotation(tool);
    }
  });
}

if (!window.PdfEditorBridge) {
  setStatus('Bridge unavailable: run inside Tauri for native file dialogs and export.');
}

renderState();

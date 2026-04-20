package app.ui;

import app.model.Annotation;
import app.model.AnnotationTool;
import app.services.AnnotationService;
import app.services.ExportService;
import app.services.PageOrderService;
import app.services.PdfRenderService;
import app.state.AppState;
import coconut.ui.View;
import js.Browser;

class RootView extends View {
  @:state var state:AppState = new AppState();

  function openPdfWorkflow() {
    PdfRenderService.openFileDialog().then(path -> {
      if (path == null || path == "") {
        state.status = "Open cancelled.";
        return;
      }

      PdfRenderService.openPdf(path).then(info -> {
        state.sessionId = info.sessionId;
        state.filePath = info.filePath;
        state.pageCount = info.pageCount;
        state.pageOrder = info.pageOrder;
        state.annotations = [];
        state.selectedIndex = 0;
        state.status = 'Opened ${info.filePath} (${info.pageCount} pages).';
        PdfRenderService.render(state.filePath, state.pageOrder);
      }).catchError(error -> {
        state.status = 'Failed to open PDF: $error';
      });
    });
  }

  function addAnnotation(tool:AnnotationTool) {
    if (state.sessionId == "") {
      state.status = "Open a PDF first.";
      return;
    }

    var pageInput = Browser.window.prompt("Page number", "1");
    var textInput = Browser.window.prompt("Annotation text", "");
    if (pageInput == null || textInput == null) {
      return;
    }

    var page = Std.parseInt(pageInput);
    if (page == null || page < 1 || page > state.pageCount) {
      state.status = "Invalid page number.";
      return;
    }

    var annotation:Annotation = {
      page: page,
      tool: cast tool,
      text: textInput
    };

    AnnotationService.addAnnotation(state.sessionId, annotation).then(_ -> {
      state.annotations = state.annotations.concat([annotation]);
      state.status = 'Added ${annotation.tool} annotation on page ${annotation.page}.';
    }).catchError(error -> {
      state.status = 'Unable to add annotation: $error';
    });
  }

  function moveSelected(delta:Int) {
    if (state.pageOrder.length == 0) {
      return;
    }

    var current = state.selectedIndex;
    var target = current + delta;
    if (target < 0 || target >= state.pageOrder.length) {
      return;
    }

    var updated = state.pageOrder.copy();
    var temp = updated[current];
    updated[current] = updated[target];
    updated[target] = temp;

    PageOrderService.saveOrder(state.sessionId, updated).then(serverOrder -> {
      state.pageOrder = serverOrder;
      state.selectedIndex = target;
      state.status = "Saved page order.";
      PdfRenderService.render(state.filePath, state.pageOrder);
    }).catchError(error -> {
      state.status = 'Unable to reorder pages: $error';
    });
  }

  function selectPage(index:Int) {
    state.selectedIndex = index;
  }

  function exportWorkflow() {
    if (state.sessionId == "") {
      state.status = "Open a PDF first.";
      return;
    }

    ExportService.saveDialog().then(path -> {
      if (path == null || path == "") {
        state.status = "Export cancelled.";
        return;
      }

      ExportService.exportSession(state.sessionId, path).then(result -> {
        state.status = 'Exported PDF copy to ${result.outputPath}. Metadata saved to ${result.metadataPath}.';
      }).catchError(error -> {
        state.status = 'Export failed: $error';
      });
    });
  }

  function render() '
    <div class="app-shell">
      <aside class="panel">
        <h1>PDF Editer MVP (Windows)</h1>
        <p class="small">Tauri + Haxe + Coconut workflow shell for open/view/annotate/reorder/export.</p>

        <section>
          <h2>1) Open &amp; view</h2>
          <div class="controls">
            <button class="primary" onclick={openPdfWorkflow}>Open local PDF</button>
          </div>
          <p class="small">Current file: ${state.filePath == "" ? "(none)" : state.filePath}</p>
        </section>

        <section>
          <h2>2) Annotate</h2>
          <div class="controls">
            <button onclick={addAnnotation(Highlight)}>Highlight</button>
            <button onclick={addAnnotation(TextNote)}>Text note</button>
            <button onclick={addAnnotation(Rectangle)}>Rectangle</button>
            <button onclick={addAnnotation(Underline)}>Underline</button>
          </div>
          <ul>
            <for ${item in state.annotations}>
              <li>Page ${item.page}: ${item.tool} - ${item.text}</li>
            </for>
          </ul>
        </section>

        <section>
          <h2>3) Reorder pages</h2>
          <p class="small">Select a page then move it.</p>
          <ol>
            <for ${i in 0...state.pageOrder.length}>
              <li>
                <button onclick={selectPage(i)}>${state.selectedIndex == i ? "▶ " : ""}Page ${state.pageOrder[i]}</button>
              </li>
            </for>
          </ol>
          <div class="controls">
            <button onclick={moveSelected(-1)}>Move up</button>
            <button onclick={moveSelected(1)}>Move down</button>
          </div>
        </section>

        <section>
          <h2>4) Export</h2>
          <button class="primary" onclick={exportWorkflow}>Export as new PDF file</button>
          <p class="small">MVP exports a copied PDF plus workflow metadata sidecar JSON.</p>
        </section>

        <p class="status">${state.status}</p>
      </aside>

      <main class="workspace">
        <div id="pdf-page-container"></div>
      </main>
    </div>
  ';
}

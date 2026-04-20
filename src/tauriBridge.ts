import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

type SessionOpenResult = {
  sessionId: string;
  filePath: string;
  pageCount: number;
  pageOrder: number[];
};

declare global {
  interface Window {
    PdfEditorBridge: {
      openFileDialog: () => Promise<string | null>;
      saveFileDialog: () => Promise<string | null>;
      openPdf: (path: string) => Promise<SessionOpenResult>;
      readPdfBytes: (path: string) => Promise<string>;
      addAnnotation: (sessionId: string, annotation: unknown) => Promise<void>;
      updatePageOrder: (sessionId: string, pageOrder: number[]) => Promise<number[]>;
      exportSession: (sessionId: string, outputPath: string) => Promise<{ outputPath: string; metadataPath: string; limitations: string[] }>;
      renderPdf: (path: string, pageOrder: number[]) => Promise<void>;
    };
  }
}

function decodeBase64ToUint8Array(base64Data: string): Uint8Array {
  const binary = atob(base64Data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

window.PdfEditorBridge = {
  async openFileDialog() {
    const selected = await open({
      title: 'Open PDF',
      multiple: false,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });

    return typeof selected === 'string' ? selected : null;
  },

  async saveFileDialog() {
    const selected = await save({
      title: 'Export workflow PDF copy',
      defaultPath: 'annotated-copy.pdf',
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });

    return selected ?? null;
  },

  async openPdf(path: string) {
    return invoke<SessionOpenResult>('open_pdf', { path });
  },

  async readPdfBytes(path: string) {
    return invoke<string>('read_pdf_bytes', { path });
  },

  async addAnnotation(sessionId, annotation) {
    await invoke('add_annotation', { sessionId, annotation });
  },

  async updatePageOrder(sessionId, pageOrder) {
    return invoke<number[]>('update_page_order', { sessionId, pageOrder });
  },

  async exportSession(sessionId, outputPath) {
    return invoke<{ outputPath: string; metadataPath: string; limitations: string[] }>('export_session', { sessionId, outputPath });
  },

  async renderPdf(path: string, pageOrder: number[]) {
    const container = document.getElementById('pdf-page-container');
    if (!container) {
      return;
    }

    container.replaceChildren();

    const base64Data = await window.PdfEditorBridge.readPdfBytes(path);
    const pdfData = decodeBase64ToUint8Array(base64Data);
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;

    const sequence = pageOrder.length > 0 ? pageOrder : Array.from({ length: pdf.numPages }, (_, index) => index + 1);

    for (const pageNo of sequence) {
      const page = await pdf.getPage(pageNo);
      const viewport = page.getViewport({ scale: 1.2 });
      const wrapper = document.createElement('section');
      wrapper.className = 'page-wrapper';

      const title = document.createElement('h3');
      title.textContent = `Page ${pageNo}`;
      wrapper.appendChild(title);

      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      wrapper.appendChild(canvas);

      const context = canvas.getContext('2d');
      if (!context) {
        continue;
      }

      await page.render({ canvasContext: context, viewport }).promise;
      container.appendChild(wrapper);
    }
  }
};

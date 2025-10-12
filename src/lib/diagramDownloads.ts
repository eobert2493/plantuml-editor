import * as plantumlEncoder from "plantuml-encoder";
import { PDFDocument } from "pdf-lib";
import { toast } from "sonner";
import { sanitizeFileName, getSvgSize, downloadBlob } from "./diagramUtils";

export const handleDownloadCurrent = async (
  format: 'svg' | 'png',
  sections: Array<{name: string, code: string, url: string}>,
  currentSection: number,
  viewMode: 'full' | 'sections' | 'stacked',
  plantUMLCode: string,
  serverBase: string
) => {
  try {
    let url = '';
    let filename = '';
    if (sections.length > 0 && viewMode === 'sections') {
      const current = sections[currentSection];
      const encoded = plantumlEncoder.encode(current.code);
      url = `${serverBase.replace(/\/$/, '')}/${format}/${encoded}`;
      filename = `${sanitizeFileName(current.name || 'Section')}.${format}`;
    } else {
      const encoded = plantumlEncoder.encode(plantUMLCode);
      url = `${serverBase.replace(/\/$/, '')}/${format}/${encoded}`;
      filename = `diagram.${format}`;
    }
    const res = await fetch(url);
    const blob = await res.blob();
    downloadBlob(blob, filename);
    toast.success(`Downloaded ${filename}`);
  } catch {
    toast.error('Failed to download');
  }
};

export const handleDownloadAllSections = async (
  format: 'svg' | 'png',
  sections: Array<{name: string, code: string, url: string}>,
  serverBase: string
) => {
  if (sections.length === 0) {
    toast.error("No sections to download");
    return;
  }
  const padWidth = Math.max(2, String(sections.length).length);
  try {
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const encoded = plantumlEncoder.encode(section.code);
      const url = `${serverBase.replace(/\/$/, '')}/${format}/${encoded}`;
      const response = await fetch(url);
      const blob = await response.blob();
      const step = String(i + 1).padStart(padWidth, '0');
      const base = sanitizeFileName(section.name || `Section ${i + 1}`);
      downloadBlob(blob, `${step} - ${base}.${format}`);
    }
    toast.success(`Downloaded all section ${format.toUpperCase()}s`);
  } catch (err) {
    toast.error("Failed to download all sections");
  }
};

export const handleDownloadStackedSvg = async (
  sections: Array<{name: string, code: string, url: string}>,
  serverBase: string
) => {
  if (sections.length === 0) {
    toast.error('No sections to download');
    return;
  }
  try {
    const texts: Array<{ name: string; svg: string; size: { width: number; height: number } }> = [];
    for (const section of sections) {
      const encoded = plantumlEncoder.encode(section.code);
      const url = `${serverBase.replace(/\/$/, '')}/svg/${encoded}`;
      const res = await fetch(url);
      const svgText = await res.text();
      const size = getSvgSize(svgText);
      texts.push({ name: section.name, svg: svgText, size });
    }
    const totalHeight = texts.reduce((sum, t) => sum + t.size.height, 0);
    const maxWidth = texts.reduce((max, t) => Math.max(max, t.size.width), 0);
    let y = 0;
    const images = texts.map((t) => {
      const base64 = btoa(unescape(encodeURIComponent(t.svg)));
      const fragment = `<image href="data:image/svg+xml;base64,${base64}" x="0" y="${y}" width="${t.size.width}" height="${t.size.height}" />`;
      y += t.size.height;
      return fragment;
    }).join('\n');
    const combined = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${maxWidth}" height="${totalHeight}">\n${images}\n</svg>`;
    const blob = new Blob([combined], { type: 'image/svg+xml' });
    downloadBlob(blob, 'stacked.svg');
    toast.success('Downloaded stacked view');
  } catch {
    toast.error('Failed to download stacked view');
  }
};

export const handleDownloadStackedPdf = async (
  sections: Array<{name: string, code: string, url: string}>,
  serverBase: string
) => {
  if (sections.length === 0) {
    toast.error('No sections to download');
    return;
  }
  try {
    const images: Array<{ png: Uint8Array; width: number; height: number; name: string }> = [];
    for (const section of sections) {
      const encoded = plantumlEncoder.encode(section.code);
      const url = `${serverBase.replace(/\/$/, '')}/png/${encoded}`;
      const res = await fetch(url);
      const blob = await res.blob();
      const arrayBuf = await blob.arrayBuffer();
      images.push({ png: new Uint8Array(arrayBuf), width: 0, height: 0, name: section.name });
    }

    const pdf = await PDFDocument.create();
    for (const img of images) {
      const page = pdf.addPage();
      const pngImage = await pdf.embedPng(img.png);
      const { width, height } = pngImage.scale(1);
      const pageWidth = page.getWidth();
      const pageHeight = page.getHeight();
      const maxWidth = pageWidth - 40;
      const maxHeight = pageHeight - 60;
      const scale = Math.min(maxWidth / width, maxHeight / height);
      const drawWidth = width * scale;
      const drawHeight = height * scale;
      const x = (pageWidth - drawWidth) / 2;
      const y = (pageHeight - drawHeight) / 2;
      page.drawImage(pngImage, { x, y, width: drawWidth, height: drawHeight });
    }

    const pdfBytes = await pdf.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    downloadBlob(blob, 'stacked.pdf');
    toast.success('Downloaded stacked view PDF');
  } catch {
    toast.error('Failed to download stacked PDF');
  }
};


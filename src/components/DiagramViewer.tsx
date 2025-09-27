import { useState, useEffect, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { RefreshCw, Download, Maximize2, Eye, Zap, ChevronLeft, ChevronRight, Grid3X3, Layers, Mouse } from "lucide-react";
import { PDFDocument, rgb } from "pdf-lib";
import * as plantumlEncoder from "plantuml-encoder";

interface DiagramViewerProps {
  plantUMLCode: string;
  onRefresh?: () => void;
  editorTab?: 'full' | 'setup' | 'sequence';
  refreshTrigger?: number;
  fileName?: string | null;
  onRenameFile?: (newName: string) => Promise<void> | void;
  serverBase?: string; // e.g. https://www.plantuml.com/plantuml or http://localhost:8080/plantuml
  onPaneLinkClick?: (paneId: string) => void;
}

export const DiagramViewer = ({ plantUMLCode, onRefresh, refreshTrigger, fileName, onRenameFile, serverBase = 'https://www.plantuml.com/plantuml', onPaneLinkClick }: DiagramViewerProps) => {
  const [diagramUrl, setDiagramUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [lastGeneratedCode, setLastGeneratedCode] = useState<string>("");
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [sections, setSections] = useState<Array<{name: string, code: string, url: string}>>([]);
  const [currentSection, setCurrentSection] = useState(0);
  const [svgHtml, setSvgHtml] = useState<string>("");
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const [previewBg, setPreviewBg] = useState<string>(() => {
    try {
      return JSON.parse(localStorage.getItem('plantuml-preview-bg') || '"#ffffff"');
    } catch {
      return '#ffffff';
    }
  });
  const [zoom, setZoom] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('plantuml-preview-zoom');
      return saved ? JSON.parse(saved) : 1;
    } catch {
      return 1;
    }
  });
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const clampZoom = (z: number) => Math.min(3, Math.max(0.25, z));
  const setZoomPersist = (z: number) => {
    const v = clampZoom(z);
    setZoom(v);
    try { localStorage.setItem('plantuml-preview-zoom', JSON.stringify(v)); } catch {}
  };

  // Space+drag panning when zoomed in
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const [isPreviewHovered, setIsPreviewHovered] = useState(false);
  const [viewMode, setViewMode] = useState<'full' | 'sections' | 'stacked'>(() => {
    try {
      const saved = localStorage.getItem('plantuml-view-mode');
      return saved ? JSON.parse(saved) : 'full';
    } catch {
      return 'full';
    }
  });
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameBase, setRenameBase] = useState<string>("");
  const [renameExt, setRenameExt] = useState<string>(".puml");
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  // Parse sections from PlantUML code
  const parseSections = useCallback((code: string) => {
    const lines = code.split('\n');
    const sectionMarkers: number[] = [];
    const sectionNames: string[] = [];
    
    // Find section markers (== Section Name ==)
    lines.forEach((line, index) => {
      const match = line.match(/^==\s*(.+?)\s*==/);
      if (match) {
        sectionMarkers.push(index);
        sectionNames.push(match[1]);
      }
    });

    if (sectionMarkers.length === 0) {
      return [];
    }

    // Extract declarations and setup from entire document (not just before first section)
    const setupLines: string[] = [];
    let foundStart = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('@startuml')) {
        setupLines.push(lines[i]);
        foundStart = true;
        continue;
      }
      
      if (!foundStart) continue;
      
      // Include participant declarations, boxes, titles, and other setup across the whole doc
      if (line.startsWith('participant') || 
          line.startsWith('actor') || 
          line.startsWith('boundary') || 
          line.startsWith('control') || 
          line.startsWith('entity') || 
          line.startsWith('database') || 
          line.startsWith('collections') || 
          line.startsWith('queue') || 
          line.startsWith('title') || 
          line.startsWith('skinparam') || 
          line.startsWith('legend') ||
          line.startsWith('box') ||
          line.startsWith('end box') ||
          (line.startsWith('note') && !line.includes('->') && !line.includes(' of ') && !line.includes(' over ')) ||
          line.startsWith('!') || 
          line === '' || 
          line.startsWith("'")) {
        setupLines.push(lines[i]);
      }
    }

    // Create sections
    const sectionsData: Array<{name: string, code: string, url: string}> = [];
    
    for (let i = 0; i < sectionMarkers.length; i++) {
      const startLine = sectionMarkers[i];
      const endLine = i < sectionMarkers.length - 1 ? sectionMarkers[i + 1] : lines.length;
      
      const sectionLines = [
        ...setupLines,
        '', // Empty line separator
        lines[startLine], // Section marker
        ...lines.slice(startLine + 1, endLine).filter(line => !line.match(/^@enduml/)),
        '@enduml'
      ];
      
      const sectionCode = sectionLines.join('\n');
      
      sectionsData.push({
        name: sectionNames[i],
        code: sectionCode,
        url: ''
      });
    }
    
    return sectionsData;
  }, []);

  const generateDiagram = useCallback(async () => {
    const previousSections = sections;
    const previousSelectedName = previousSections[currentSection]?.name;

    if (!plantUMLCode.trim()) {
      setDiagramUrl("");
      setError("");
      setLastGeneratedCode("");
      setNeedsRefresh(false);
      setSections([]);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Parse sections
      const parsedSections = parseSections(plantUMLCode);

      if (parsedSections.length > 0) {
        // Generate URLs for all sections
        const sectionsWithUrls = await Promise.all(
          parsedSections.map(async (section) => {
            const encoded = plantumlEncoder.encode(section.code);
            return {
              ...section,
              url: `${serverBase.replace(/\/$/, '')}/svg/${encoded}`
            };
          })
        );

        setSections(sectionsWithUrls);

        // Preserve selected section if it still exists
        let nextIndex = 0;
        if (previousSelectedName) {
          const foundIndex = sectionsWithUrls.findIndex(s => s.name === previousSelectedName);
          if (foundIndex >= 0) nextIndex = foundIndex;
        } else if (currentSection < sectionsWithUrls.length) {
          nextIndex = currentSection;
        }
        setCurrentSection(nextIndex);

        // Determine desired view mode: restore saved if compatible, else keep current
        let desired: 'full' | 'sections' | 'stacked' = viewMode;
        try {
          const saved = localStorage.getItem('plantuml-view-mode');
          if (saved) desired = JSON.parse(saved);
        } catch {}

        // If desired is sections or stacked, use it; if full, show full
        if (desired === 'full') {
          const encoded = plantumlEncoder.encode(plantUMLCode);
          setDiagramUrl(`${serverBase.replace(/\/$/, '')}/svg/${encoded}`);
          setViewMode('full');
        } else if (desired === 'sections') {
          setDiagramUrl(sectionsWithUrls[nextIndex]?.url || '');
          setViewMode('sections');
        } else if (desired === 'stacked') {
          setDiagramUrl('');
          setViewMode('stacked');
        }
      } else {
        // No sections; force full view
        const encoded = plantumlEncoder.encode(plantUMLCode);
        const url = `${serverBase.replace(/\/$/, '')}/svg/${encoded}`;
        setDiagramUrl(url);
        setSections([]);
        setViewMode('full');
        try { localStorage.setItem('plantuml-view-mode', JSON.stringify('full')); } catch {}
      }
      
      setLastGeneratedCode(plantUMLCode);
      setNeedsRefresh(false);
      // Only toast when this was an explicit refresh (not the very first generation)
      if (lastGeneratedCode !== "") {
        toast.success("Diagram updated!");
      }
    } catch (err) {
      setError("Invalid PlantUML syntax");
      console.error("PlantUML encoding error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [plantUMLCode, parseSections]);

  // Check if diagram needs refresh when code changes
  useEffect(() => {
    if (plantUMLCode !== lastGeneratedCode && lastGeneratedCode !== "") {
      setNeedsRefresh(true);
    } else if (plantUMLCode === lastGeneratedCode) {
      setNeedsRefresh(false);
    }
  }, [plantUMLCode, lastGeneratedCode]);

  // Generate initial diagram
  useEffect(() => {
    if (plantUMLCode.trim() && lastGeneratedCode === "") {
      generateDiagram();
    }
  }, [plantUMLCode, lastGeneratedCode, generateDiagram]);

  // Trigger regeneration when parent requests refresh without remount
  useEffect(() => {
    if (refreshTrigger !== undefined) {
      generateDiagram();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sanitizeFileName = (name: string) => {
    return name
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/\s+/g, " ")
      .trim();
  };

  const handleDownloadCurrent = async (format: 'svg' | 'png') => {
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

  const handleDownloadAllSections = async (format: 'svg' | 'png') => {
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

  const getSvgSize = (svgText: string): { width: number; height: number } => {
    const widthMatch = svgText.match(/width="(\d+(?:\.\d+)?)px"/);
    const heightMatch = svgText.match(/height="(\d+(?:\.\d+)?)px"/);
    const viewBoxMatch = svgText.match(/viewBox="[\d\.]+ [\d\.]+ ([\d\.]+) ([\d\.]+)"/);
    let width = widthMatch ? parseFloat(widthMatch[1]) : (viewBoxMatch ? parseFloat(viewBoxMatch[1]) : 0);
    let height = heightMatch ? parseFloat(heightMatch[1]) : (viewBoxMatch ? parseFloat(viewBoxMatch[2]) : 0);
    if (!width || !height) {
      width = 800;
      height = 600;
    }
    return { width, height };
  };

  const handleDownloadStackedSvg = async () => {
    if (sections.length === 0) {
      toast.error('No sections to download');
      return;
    }
    try {
      // Fetch all SVG texts
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
      const padWidth = Math.max(2, String(texts.length).length);
      const images = texts.map((t, idx) => {
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

  const handleDownloadStackedPdf = async () => {
    if (sections.length === 0) {
      toast.error('No sections to download');
      return;
    }
    try {
      // Fetch PNGs for each section for wide PDF compatibility
      const images: Array<{ png: Uint8Array; width: number; height: number; name: string }> = [];
      for (const section of sections) {
        const encoded = plantumlEncoder.encode(section.code);
        const url = `${serverBase.replace(/\/$/, '')}/png/${encoded}`;
        const res = await fetch(url);
        const blob = await res.blob();
        const arrayBuf = await blob.arrayBuffer();
        // We don't know the dimensions from the PNG headers directly here; pdf-lib will scale to page size
        images.push({ png: new Uint8Array(arrayBuf), width: 0, height: 0, name: section.name });
      }

      const pdf = await PDFDocument.create();
      for (const img of images) {
        const page = pdf.addPage();
        const pngImage = await pdf.embedPng(img.png);
        const { width, height } = pngImage.scale(1);
        const pageWidth = page.getWidth();
        const pageHeight = page.getHeight();
        // Fit image within page while preserving aspect ratio with margins
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

  const handleRefresh = () => {
    generateDiagram();
    toast.success("Diagram refreshed!");
  };

  const handleSectionChange = (index: number) => {
    if (sections[index]) {
      setCurrentSection(index);
      setDiagramUrl(sections[index].url);
    }
  };

  const setViewModeDirectly = (mode: 'full' | 'sections' | 'stacked') => {
    if (mode === 'full') {
      setViewMode('full');
      const encoded = plantumlEncoder.encode(plantUMLCode);
      setDiagramUrl(`${serverBase.replace(/\/$/, '')}/svg/${encoded}`);
      setSvgHtml("");
      try { localStorage.setItem('plantuml-view-mode', JSON.stringify('full')); } catch {}
      return;
    }

    if (sections.length > 0) {
      setViewMode(mode);
      if (mode === 'sections') {
        setDiagramUrl(sections[currentSection]?.url || '');
        setSvgHtml("");
      } else if (mode === 'stacked') {
        setDiagramUrl(''); // Not needed for stacked view
        setSvgHtml("");
      }
      try { localStorage.setItem('plantuml-view-mode', JSON.stringify(mode)); } catch {}
    }
  };

  // Fetch SVG text for inline rendering when showing a single image (full/sections)
  useEffect(() => {
    let cancelled = false;
    const shouldInline = !!diagramUrl && (viewMode === 'full' || viewMode === 'sections');
    if (!shouldInline) return;
    (async () => {
      try {
        const res = await fetch(diagramUrl);
        const text = await res.text();
        if (!cancelled) setSvgHtml(text);
      } catch (e) {
        if (!cancelled) setSvgHtml('');
      }
    })();
    return () => { cancelled = true; };
  }, [diagramUrl, viewMode]);

  // After SVG HTML is injected, normalize sizing and wire link clicks
  useEffect(() => {
    const root = svgContainerRef.current;
    if (!root || !svgHtml) return;
    // Ensure SVG scales to container width
    const svg = root.querySelector('svg');
    if (svg) {
      (svg as SVGElement).setAttribute('style', 'max-width: 100%; height: auto;');
    }
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest('a') as HTMLAnchorElement | SVGAElement | null;
      if (!anchor) return;
      const href = (anchor as any).getAttribute('href') || (anchor as any).getAttribute('xlink:href');
      if (typeof href === 'string' && href.startsWith('pane:')) {
        e.preventDefault();
        const paneId = href.slice('pane:'.length);
        if (onPaneLinkClick) onPaneLinkClick(paneId);
      }
    };
    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  }, [svgHtml, onPaneLinkClick]);

  // Ctrl/Cmd + mouse wheel zoom inside preview
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY;
        const next = zoom + (delta > 0 ? -0.1 : 0.1);
        setZoomPersist(next);
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel as any);
  }, [zoom]);

  // Manage space key state
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const target = e.target as HTMLElement | null;
      // Never interfere with typing in inputs/editors
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) {
        return;
      }
      if (isPreviewHovered && zoom > 1) {
        setIsSpacePressed(true);
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
        panStartRef.current = null;
      }
    };
    document.addEventListener('keydown', down);
    document.addEventListener('keyup', up);
    return () => {
      document.removeEventListener('keydown', down);
      document.removeEventListener('keyup', up);
    };
  }, [zoom, isPreviewHovered]);

  // Mouse drag to pan when space held and zoomed in
  useEffect(() => {
    const area = scrollAreaRef.current;
    if (!area) return;
    const onMouseDown = (e: MouseEvent) => {
      if (!isSpacePressed || zoom <= 1) return;
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY, left: area.scrollLeft, top: area.scrollTop };
      e.preventDefault();
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isPanning || !panStartRef.current) return;
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      area.scrollLeft = panStartRef.current.left - dx;
      area.scrollTop = panStartRef.current.top - dy;
    };
    const onMouseUp = () => {
      setIsPanning(false);
      panStartRef.current = null;
    };
    area.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      area.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isSpacePressed, isPanning, zoom]);

  return (
    <Card className="h-full bg-editor-panel border-editor-border flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-editor-border relative">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-editor-keyword" />
          <h3 className="text-sm font-medium text-editor-text">Diagram Preview</h3>
          {/* filename shown in centered overlay */}
          {needsRefresh && !isLoading && (
            <div className="flex items-center gap-1 text-xs text-amber-400">
              <Zap className="w-3 h-3" />
              <span>Press Cmd+J to refresh</span>
            </div>
          )}
          {isLoading && (
            <div className="w-3 h-3 border border-editor-keyword border-t-transparent rounded-full animate-spin" />
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {/* Background color picker */}
          <div className="hidden md:flex items-center mr-2 relative z-10">
            <input
              type="color"
              title="Preview background"
              value={previewBg}
              onChange={(e) => {
                const val = e.target.value || '#ffffff';
                setPreviewBg(val);
                try { localStorage.setItem('plantuml-preview-bg', JSON.stringify(val)); } catch {}
              }}
              className="w-7 h-7 p-0 border border-editor-border rounded bg-transparent cursor-pointer appearance-none"
              style={{ WebkitAppearance: 'none' as any }}
            />
          </div>
          {/* Zoom controls removed per request */}
          {/* View mode toggle - desktop */}
          <div className="hidden md:flex items-center gap-1 mr-2">
            <Button
              variant={viewMode === 'full' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewModeDirectly('full')}
              className="h-8 w-8 p-0 text-editor-comment hover:text-editor-text hover:bg-editor-background"
              title="Full diagram view"
            >
              <Eye className="w-3 h-3" />
            </Button>
            <Button
              variant={viewMode === 'sections' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewModeDirectly('sections')}
              disabled={sections.length === 0}
              className="h-8 w-8 p-0 text-editor-comment hover:text-editor-text hover:bg-editor-background disabled:opacity-50"
              title="Section navigation view"
            >
              <Grid3X3 className="w-3 h-3" />
            </Button>
            <Button
              variant={viewMode === 'stacked' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewModeDirectly('stacked')}
              disabled={sections.length === 0}
              className="h-8 w-8 p-0 text-editor-comment hover:text-editor-text hover:bg-editor-background disabled:opacity-50"
              title="Stacked sections view"
            >
              <Layers className="w-3 h-3" />
            </Button>
          </div>

          {/* View mode toggle - mobile: dropdown */}
          <div className="md:hidden mr-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-editor-comment hover:text-editor-text hover:bg-editor-background"
                  title="View options"
                >
                  <Grid3X3 className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
                <DropdownMenuItem onClick={() => setViewModeDirectly('full')}>Full</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setViewModeDirectly('sections')} disabled={sections.length === 0}>Sections</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setViewModeDirectly('stacked')} disabled={sections.length === 0}>Stacked</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="hidden sm:inline-flex h-8 w-8 p-0 text-editor-comment hover:text-editor-text hover:bg-editor-background"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-editor-comment hover:text-editor-text hover:bg-editor-background"
                title="Download options"
                disabled={isLoading}
              >
                <Download className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => handleDownloadCurrent('svg')}>Download current (SVG)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownloadCurrent('png')}>Download current (PNG)</DropdownMenuItem>
              {sections.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleDownloadAllSections('svg')}>Download sections (SVG)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownloadAllSections('png')}>Download sections (PNG)</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDownloadStackedSvg}>Download stacked view (SVG)</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownloadStackedPdf}>Download stacked view (PDF)</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Centered file name overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="text-center max-w-[60%] pointer-events-auto">
            <div className="text-sm text-editor-text truncate">
              {isRenaming ? (
                <span className="inline-flex items-center gap-1">
                  <input
                    ref={renameInputRef}
                    value={renameBase}
                    onChange={(e) => setRenameBase(e.target.value)}
                    onBlur={async () => {
                      if (!onRenameFile) { setIsRenaming(false); return; }
                      const base = renameBase.trim();
                      if (!base) { setIsRenaming(false); return; }
                      const newName = `${base}${renameExt}`;
                      try { await onRenameFile(newName); } finally { setIsRenaming(false); }
                    }}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        (e.currentTarget as HTMLInputElement).blur();
                      } else if (e.key === 'Escape') {
                        setIsRenaming(false);
                      }
                    }}
                    size={Math.max(1, renameBase.length)}
                    size={Math.max(1, renameBase.length)}
                    className="bg-editor-background border border-editor-border rounded px-2 py-1 text-sm outline-none ring-1 ring-primary/30"
                    placeholder="File name"
                  />
                  <span className="text-editor-comment select-none">{renameExt}</span>
                </span>
              ) : (
                <span
                  onDoubleClick={() => {
                    const current = fileName || 'Untitled.puml';
                    const dot = current.lastIndexOf('.');
                    const base = dot > 0 ? current.slice(0, dot) : current;
                    const ext = dot > 0 ? current.slice(dot) : '.puml';
                    setRenameBase(base);
                    setRenameExt(ext);
                    setIsRenaming(true);
                  }}
                  title="Double-click to rename"
                >
                  {fileName || 'Untitled.puml'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        ref={scrollAreaRef}
        className="flex-1 overflow-auto bg-editor-background scrollbar-themed pr-3"
        style={{ backgroundColor: previewBg }}
        onMouseEnter={() => setIsPreviewHovered(true)}
        onMouseLeave={() => { setIsPreviewHovered(false); setIsPanning(false); panStartRef.current = null; }}
      >
        {isSpacePressed && isPreviewHovered && zoom > 1 && (
          <div className="sticky top-2 z-10 flex justify-end px-4 pointer-events-none">
            <div className="bg-editor-panel/80 border border-editor-border rounded px-2 py-1 text-editor-comment flex items-center">
              <Mouse className="w-3 h-3" />
            </div>
          </div>
        )}
        {error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-destructive text-sm mb-2">Error</div>
              <div className="text-editor-comment text-xs">{error}</div>
            </div>
          </div>
        ) : !plantUMLCode.trim() ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Maximize2 className="w-12 h-12 text-editor-comment mx-auto mb-3" />
              <div className="text-editor-comment text-sm">
                Start typing PlantUML code to see the diagram preview
              </div>
            </div>
          </div>
        ) : viewMode === 'stacked' && sections.length > 0 ? (
          // Stacked view - show all sections vertically
          <div className="p-4 space-y-6">
            {sections.map((section) => (
              <div key={section.name} className="border border-editor-border rounded-lg overflow-hidden">
                <div className="bg-editor-panel px-4 py-2 border-b border-editor-border">
                  <h4 className="text-sm font-medium text-editor-text">
                    {section.name}
                  </h4>
                  <p className="text-xs text-editor-comment">
                    {/* Index displayed below may be off if names duplicate */}
                  </p>
                </div>
                <div className="p-4 flex justify-center" style={{ backgroundColor: previewBg }}>
                  <img
                    src={section.url}
                    alt={`Section: ${section.name}`}
                    className="max-w-full h-auto rounded-md"
                    onError={() => setError(`Failed to load section: ${section.name}`)}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : diagramUrl ? (
          // Single diagram view (full or current section)
          <div className={`p-4 flex ${viewMode === 'sections' ? 'items-start' : 'items-center'} justify-center min-h-full w-full`}>
            <div className="w-full">
              {sections.length > 0 && viewMode === 'sections' ? (
                <div className="border border-editor-border rounded-lg overflow-hidden">
                  <div className="bg-editor-panel px-4 py-2 border-b border-editor-border flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-editor-text">
                        {sections[currentSection]?.name}
                      </h4>
                      <p className="text-xs text-editor-comment">
                        Section {currentSection + 1} of {sections.length}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSectionChange(Math.max(0, currentSection - 1))}
                        disabled={currentSection === 0}
                        className="h-6 w-6 p-0 text-editor-comment hover:text-editor-text"
                        title="Previous section"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSectionChange(Math.min(sections.length - 1, currentSection + 1))}
                        disabled={currentSection === sections.length - 1}
                        className="h-6 w-6 p-0 text-editor-comment hover:text-editor-text"
                        title="Next section"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                <div className="p-4" style={{ backgroundColor: previewBg }}>
                  <div className="w-full flex justify-center">
                      {svgHtml ? (
                      <div
                          ref={svgContainerRef}
                        className="max-w-full h-auto rounded-md"
                        style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', display: 'inline-block' }}
                        dangerouslySetInnerHTML={{ __html: svgHtml }}
                        />
                      ) : (
                      <img
                          src={diagramUrl}
                          alt="PlantUML Diagram"
                        className="max-w-full h-auto rounded-md"
                        style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
                          onError={() => setError("Failed to load diagram")}
                        
                        />
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`w-full flex justify-center ${isSpacePressed && zoom > 1 ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : ''}`} style={{ backgroundColor: previewBg }}>
                  {svgHtml ? (
                    <div
                      ref={svgContainerRef}
                      className="max-w-full h-auto rounded-md"
                      style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', display: 'inline-block' }}
                      dangerouslySetInnerHTML={{ __html: svgHtml }}
                    />
                  ) : (
                    <img
                      src={diagramUrl}
                      alt="PlantUML Diagram"
                      className="max-w-full h-auto rounded-md"
                      style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
                      onError={() => setError("Failed to load diagram")}
                      
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-editor-keyword border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <div className="text-editor-comment text-sm">Generating diagram...</div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
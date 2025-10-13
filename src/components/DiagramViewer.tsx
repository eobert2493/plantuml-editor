import { useState, useEffect, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import * as plantumlEncoder from "plantuml-encoder";
import { SectionCard } from "./SectionCard";
import { SectionNavigator } from "./SectionNavigator";
import { FullDiagramView } from "./FullDiagramView";
import { DiagramViewerHeader } from "./DiagramViewerHeader";
import { EmptyDiagramState } from "./EmptyDiagramState";
import { ErrorState } from "./ErrorState";
import { LoadingState } from "./LoadingState";
import { useSvgFetcher } from "@/hooks/useSvgFetcher";
import { parseSections } from "@/lib/diagramUtils";
import { 
  handleDownloadCurrent as downloadCurrent,
  handleDownloadAllSections as downloadAllSections,
  handleDownloadStackedSvg as downloadStackedSvg,
  handleDownloadStackedPdf as downloadStackedPdf
} from "@/lib/diagramDownloads";

interface DiagramViewerProps {
  plantUMLCode: string;
  onRefresh?: () => void;
  editorTab?: 'full' | 'setup' | 'sequence';
  refreshTrigger?: number;
  fileName?: string | null;
  onRenameFile?: (newName: string) => Promise<void> | void;
  serverBase?: string; // e.g. https://www.plantuml.com/plantuml or http://localhost:8080/plantuml
  pageTheme?: 'light' | 'dark';
  zenMode?: boolean;
  onExitZenMode?: () => void;
  isServerOnline?: boolean | null;
  serverMode?: 'public' | 'custom';
}

export const DiagramViewer = ({ plantUMLCode, onRefresh, refreshTrigger, fileName, onRenameFile, serverBase = 'https://www.plantuml.com/plantuml', pageTheme = 'dark', zenMode = false, onExitZenMode, isServerOnline, serverMode }: DiagramViewerProps) => {
  const [diagramUrl, setDiagramUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [lastGeneratedCode, setLastGeneratedCode] = useState<string>("");
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [sections, setSections] = useState<Array<{name: string, code: string, url: string}>>([]);
  const [currentSection, setCurrentSection] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [stackedSvgs, setStackedSvgs] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<'full' | 'sections' | 'stacked'>(() => {
    try {
      const saved = localStorage.getItem('plantuml-view-mode');
      return saved ? JSON.parse(saved) : 'full';
    } catch (e) {
      return 'full';
    }
  });
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const wasServerOfflineRef = useRef(false);
  
  // Track when server transitions from offline to online
  useEffect(() => {
    if (isServerOnline === false) {
      wasServerOfflineRef.current = true;
    } else if (isServerOnline === true && !error) {
      // Reset flag when error is cleared (diagram loaded successfully)
      wasServerOfflineRef.current = false;
    }
  }, [isServerOnline, error]);
  
  // Custom hooks
  const svgHtml = useSvgFetcher(diagramUrl, viewMode);
  
  // Full view always white, section views match theme
  const getPreviewBg = (forView: 'full' | 'sections' | 'stacked') => {
    if (forView === 'full') return '#ffffff';
    return pageTheme === 'dark' ? '#000000' : '#ffffff';
  };

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
        
        // Initialize all sections as expanded by default
        setExpandedSections(new Set(sectionsWithUrls.map(s => s.name)));

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
        } catch (e) {
          // Ignore localStorage errors
        }

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
        try { localStorage.setItem('plantuml-view-mode', JSON.stringify('full')); } catch (e) { /* Ignore */ }
      }
      
      setLastGeneratedCode(plantUMLCode);
      setNeedsRefresh(false);
    } catch (err) {
      setError("Invalid PlantUML syntax");
      console.error("PlantUML encoding error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [plantUMLCode, currentSection, sections, viewMode, serverBase, lastGeneratedCode]);

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

  // Helper functions
  const handleRefresh = () => {
    generateDiagram();
  };

  const handleSectionChange = (index: number) => {
    if (sections[index]) {
      setCurrentSection(index);
      setDiagramUrl(sections[index].url);
    }
  };

  const toggleSectionExpanded = (sectionName: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionName)) {
        newSet.delete(sectionName);
      } else {
        newSet.add(sectionName);
      }
      return newSet;
    });
  };

  const setViewModeDirectly = (mode: 'full' | 'sections' | 'stacked') => {
    if (mode === 'full') {
      setViewMode('full');
      const encoded = plantumlEncoder.encode(plantUMLCode);
      setDiagramUrl(`${serverBase.replace(/\/$/, '')}/svg/${encoded}`);
      try { localStorage.setItem('plantuml-view-mode', JSON.stringify('full')); } catch (e) { /* Ignore */ }
      return;
    }

    if (sections.length > 0) {
      setViewMode(mode);
      if (mode === 'sections') {
        setDiagramUrl(sections[currentSection]?.url || '');
      } else if (mode === 'stacked') {
        setDiagramUrl('');
      }
      try { localStorage.setItem('plantuml-view-mode', JSON.stringify(mode)); } catch (e) { /* Ignore */ }
    }
  };

  // Fetch SVG text for stacked view sections
  useEffect(() => {
    if (viewMode !== 'stacked' || sections.length === 0) {
      setStackedSvgs({});
      return;
    }
    
    let cancelled = false;
    const fetchAll = async () => {
      const svgs: Record<string, string> = {};
      for (const section of sections) {
        try {
          const res = await fetch(section.url);
        const text = await res.text();
          if (!cancelled) svgs[section.name] = text;
      } catch (e) {
          if (!cancelled) svgs[section.name] = '';
        }
      }
      if (!cancelled) setStackedSvgs(svgs);
    };
    fetchAll();
    return () => { cancelled = true; };
  }, [viewMode, sections]);

  // After SVG HTML is injected, normalize sizing
  useEffect(() => {
    const root = svgContainerRef.current;
    if (!root || !svgHtml) return;
    const svg = root.querySelector('svg');
    if (svg) {
      (svg as SVGElement).setAttribute('style', 'max-width: 100%; height: auto;');
    }
  }, [svgHtml]);

  // Normalize sizing for stacked view SVGs
  useEffect(() => {
    if (viewMode !== 'stacked' || Object.keys(stackedSvgs).length === 0) return;
    
    const container = scrollAreaRef.current;
    if (!container) return;
    
    const svgs = container.querySelectorAll('.stacked-section-content svg');
    if (svgs) {
      svgs.forEach((svg) => {
        const svgEl = svg as SVGElement;
        svgEl.removeAttribute('width');
        svgEl.removeAttribute('height');
      });
    }
  }, [stackedSvgs, viewMode]);

  return (
    <Card className="h-full bg-editor-panel border-editor-border flex flex-col relative">
      {!zenMode && (
        <DiagramViewerHeader
          needsRefresh={needsRefresh}
          isLoading={isLoading}
          viewMode={viewMode}
          hasSections={sections.length > 0}
          fileName={fileName}
          onSetViewMode={setViewModeDirectly}
          onRefresh={handleRefresh}
          onRenameFile={onRenameFile}
          onDownloadCurrent={(format) => downloadCurrent(format, sections, currentSection, viewMode, plantUMLCode, serverBase)}
          onDownloadAllSections={(format) => downloadAllSections(format, sections, serverBase)}
          onDownloadStackedSvg={() => downloadStackedSvg(sections, serverBase)}
          onDownloadStackedPdf={() => downloadStackedPdf(sections, serverBase)}
        />
      )}
      
      {zenMode && onExitZenMode && (
        <div className="absolute bottom-4 right-4 z-50 opacity-30 hover:opacity-100 transition-opacity">
          <button
            onClick={onExitZenMode}
            className="bg-editor-background/90 backdrop-blur-sm border border-editor-border text-editor-text px-3 py-1.5 rounded-md text-xs font-medium hover:bg-editor-panel shadow-lg"
            title="Exit Zen Mode (Esc)"
          >
            Exit Zen Mode
          </button>
        </div>
      )}

      <div
        ref={scrollAreaRef}
        className="flex-1 overflow-y-auto overflow-x-hidden bg-editor-background scrollbar-themed pr-3"
        style={{ backgroundColor: getPreviewBg(viewMode) }}
      >
        
        {error ? (
          <ErrorState error={error} isServerOnline={isServerOnline} serverMode={serverMode} wasServerOffline={wasServerOfflineRef.current} />
        ) : !plantUMLCode.trim() ? (
          <EmptyDiagramState />
        ) : viewMode === 'stacked' && sections.length > 0 ? (
          // Stacked view - show all sections vertically
          <div className="p-4 flex items-start justify-center min-h-full w-full">
            <div className="w-full space-y-6">
              {sections.map((section, index) => (
                <SectionCard
                  key={section.name}
                  sectionName={section.name}
                  sectionIndex={index}
                  totalSections={sections.length}
                  sectionUrl={section.url}
                  svgHtml={stackedSvgs[section.name]}
                  isExpanded={expandedSections.has(section.name)}
                  onToggleExpand={() => toggleSectionExpanded(section.name)}
                  onError={setError}
                />
              ))}
              </div>
          </div>
        ) : diagramUrl ? (
          // Single diagram view (full or current section)
          <div className={`p-4 flex ${viewMode === 'sections' ? 'items-start' : 'items-center'} justify-center min-h-full w-full`}>
            <div className="w-full">
              {sections.length > 0 && viewMode === 'sections' ? (
                <SectionNavigator
                  sectionName={sections[currentSection]?.name}
                  currentIndex={currentSection}
                  totalSections={sections.length}
                  svgHtml={svgHtml}
                  diagramUrl={diagramUrl}
                  svgContainerRef={svgContainerRef}
                  onPrevious={() => handleSectionChange(Math.max(0, currentSection - 1))}
                  onNext={() => handleSectionChange(Math.min(sections.length - 1, currentSection + 1))}
                  onError={setError}
                />
              ) : (
                <div className="p-4 bg-white">
                  <FullDiagramView
                    svgHtml={svgHtml}
                    diagramUrl={diagramUrl}
                    svgContainerRef={svgContainerRef}
                    onError={setError}
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <LoadingState />
        )}
      </div>
    </Card>
  );
};
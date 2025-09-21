import { useState, useEffect, useCallback } from "react";
import { PlantUMLEditor } from "@/components/PlantUMLEditor";
import { DiagramViewer } from "@/components/DiagramViewer";
import { LocalFilesSidebar } from "@/components/LocalFilesSidebar";
import { ResizableLayout } from "@/components/ResizableLayout";
import { ensureDefault, getFile, updateFileContent, createFile } from "@/lib/fileStore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [plantUMLCode, setPlantUMLCode] = useState("@startuml\n@enduml\n");
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const [showLeftPanel, setShowLeftPanel] = useState(() => {
    try {
      const saved = localStorage.getItem('plantuml-show-left-panel');
      return saved ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const [showFilesSidebar, setShowFilesSidebar] = useState(() => {
    try {
      const saved = localStorage.getItem('plantuml-show-files-sidebar');
      return saved ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  // Load or create default file
  useEffect(() => {
    (async () => {
      const file = await ensureDefault(plantUMLCode);
      setActiveFileId(file.id);
      setPlantUMLCode(file.content);
      setRefreshTrigger((p) => p + 1);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Debounced autosave
  useEffect(() => {
    if (!activeFileId) return;
    const handle = setTimeout(async () => {
      try {
        await updateFileContent(activeFileId, plantUMLCode);
      } catch (e) {
        toast.error("Failed to save");
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [plantUMLCode, activeFileId]);

  const handleSelectFile = async (id: string) => {
    const file = await getFile(id);
    if (!file) return;
    setActiveFileId(id);
    setPlantUMLCode(file.content);
    setRefreshTrigger((p) => p + 1);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
      event.preventDefault();
      const newShowLeftPanel = !showLeftPanel;
      setShowLeftPanel(newShowLeftPanel);
      localStorage.setItem('plantuml-show-left-panel', JSON.stringify(newShowLeftPanel));
    }
  }, [showLeftPanel]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="h-screen bg-gradient-background flex flex-col">

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Local Files Sidebar */}
        {showFilesSidebar && (
          <div className="w-72 border-r border-editor-border bg-editor-background">
            <LocalFilesSidebar activeFileId={activeFileId} onSelectFile={handleSelectFile} />
          </div>
        )}

        {/* Editor and Viewer */}
        <div className="flex-1">
          <ResizableLayout
            leftPanel={
              showLeftPanel ? (
              <PlantUMLEditor
                value={plantUMLCode}
                onChange={setPlantUMLCode}
                onRefresh={handleRefresh}
                onToggleSidebar={() => {
                  const next = !showFilesSidebar;
                  setShowFilesSidebar(next);
                  try { localStorage.setItem('plantuml-show-files-sidebar', JSON.stringify(next)); } catch {}
                }}
                filesSidebarVisible={showFilesSidebar}
              />
              ) : null
            }
            rightPanel={
              <DiagramViewer 
                plantUMLCode={plantUMLCode} 
                refreshTrigger={refreshTrigger}
                onRefresh={handleRefresh}
              />
            }
            hideLeftPanel={!showLeftPanel}
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-editor-panel border-t border-editor-border px-4 py-2">
        <div className="flex items-center justify-between text-xs text-editor-comment">
          <div className="flex items-center gap-3">
            <div>
              Ready • {plantUMLCode.split('\n').length} lines
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span>PlantUML Server Online</span>
            <span>•</span>
            <span>Press Cmd+J to refresh • Cmd+B to toggle editor</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;

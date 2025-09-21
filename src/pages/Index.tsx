import { useState, useEffect, useCallback } from "react";
import { PlantUMLEditor } from "@/components/PlantUMLEditor";
import { DiagramViewer } from "@/components/DiagramViewer";
import { LocalFilesSidebar } from "@/components/LocalFilesSidebar";
import { ResizableLayout } from "@/components/ResizableLayout";
import { ensureDefault, getFile, updateFileContent, createFile, listFiles, renameFile, deleteFile } from "@/lib/fileStore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Moon, Sun, Palette } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const Index = () => {
  const [plantUMLCode, setPlantUMLCode] = useState("@startuml\n@enduml\n");
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [activeFileName, setActiveFileName] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isServerOnline, setIsServerOnline] = useState<boolean | null>(null);
  const [isFilePaletteOpen, setIsFilePaletteOpen] = useState(false);
  const [filesForPalette, setFilesForPalette] = useState<{ id: string; name: string; updatedAt: number }[]>([]);
  const [editorTheme, setEditorTheme] = useState<'vs-dark' | 'vs-light' | 'hc-black' | 'plantuml-dark'>(() => {
    try {
      return (localStorage.getItem('editor-theme') as any) || 'plantuml-dark';
    } catch {
      return 'plantuml-dark';
    }
  });
  const [splitOrientation, setSplitOrientation] = useState<'horizontal' | 'vertical'>(() => {
    try { return (localStorage.getItem('split-orientation') as any) || 'horizontal'; } catch { return 'horizontal'; }
  });
  const [pageTheme, setPageTheme] = useState<'light' | 'dark'>(() => {
    try {
      return (localStorage.getItem('page-theme') as 'light' | 'dark') || 'dark';
    } catch {
      return 'dark';
    }
  });
  
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
      setActiveFileName(file.name);
      setPlantUMLCode(file.content);
      setRefreshTrigger((p) => p + 1);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Command+K listener for file palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsFilePaletteOpen(true);
        (async () => {
          const list = await listFiles();
          setFilesForPalette(list.map(f => ({ id: f.id, name: f.name, updatedAt: f.updatedAt })));
        })();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Apply page theme to html element
  useEffect(() => {
    const root = document.documentElement;
    if (pageTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try { localStorage.setItem('page-theme', pageTheme); } catch {}
  }, [pageTheme]);

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
    setActiveFileName(file.name);
    setPlantUMLCode(file.content);
    setRefreshTrigger((p) => p + 1);
  };

  // PlantUML server status checker (image ping)
  useEffect(() => {
    const check = () => {
      const encoded = "SoWkIImgAStDuNBAJrBGjLDmpCbCJbMmKiX8pSd9pKi1"; // minimal @startuml..@enduml
      const url = `https://www.plantuml.com/plantuml/svg/${encoded}`;
      const img = new Image();
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) setIsServerOnline(false);
      }, 5000);
      img.onload = () => {
        settled = true;
        clearTimeout(timer);
        setIsServerOnline(true);
      };
      img.onerror = () => {
        settled = true;
        clearTimeout(timer);
        setIsServerOnline(false);
      };
      img.src = url;
    };
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, []);

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
        {false && showFilesSidebar && (
          <div className="w-72 border-r border-editor-border bg-editor-background">
            <LocalFilesSidebar activeFileId={activeFileId} onSelectFile={handleSelectFile} onActiveFileRenamed={(n) => setActiveFileName(n)} />
          </div>
        )}

        {/* Editor and Viewer */}
        <div className="flex-1">
          {(() => {
            const editorEl = (
              <PlantUMLEditor
                value={plantUMLCode}
                onChange={setPlantUMLCode}
                onRefresh={handleRefresh}
                editorTheme={editorTheme}
                editorOptions={{
                  renderWhitespace: 'selection',
                  renderIndentGuides: true,
                  guides: { indentation: true, bracketPairs: true },
                  cursorBlinking: 'smooth',
                  cursorSmoothCaretAnimation: 'on',
                  smoothScrolling: true,
                  tabSize: 2,
                  insertSpaces: true,
                  bracketPairColorization: { enabled: true },
                  formatOnPaste: false,
                  formatOnType: false,
                  occurrencesHighlight: true,
                  selectionHighlight: true,
                  wordBasedSuggestions: true,
                  quickSuggestions: { other: true, comments: false, strings: true },
                  folding: true,
                  foldingHighlight: true,
                  mouseWheelZoom: true,
                }}
              />
            );
            const viewerEl = (
              <DiagramViewer 
                plantUMLCode={plantUMLCode} 
                refreshTrigger={refreshTrigger}
                onRefresh={handleRefresh}
                fileName={activeFileName}
                onRenameFile={async (newName) => {
                  if (!activeFileId) return;
                  await renameFile(activeFileId, newName);
                  setActiveFileName(newName);
                }}
              />
            );
            const isVertical = splitOrientation === 'vertical';
            return (
              <ResizableLayout
                leftPanel={isVertical ? viewerEl : (showLeftPanel ? editorEl : null)}
                rightPanel={isVertical ? editorEl : viewerEl}
                hideLeftPanel={isVertical ? false : !showLeftPanel}
                orientation={splitOrientation}
              />
            );
          })()}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-editor-panel border-t border-editor-border px-4 py-2">
        <div className="flex items-center justify-between text-xs text-editor-comment">
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs"
              onClick={() => setPageTheme(prev => prev === 'dark' ? 'light' : 'dark')}
              title={`Switch to ${pageTheme === 'dark' ? 'Light' : 'Dark'} mode`}
            >
              {pageTheme === 'dark' ? <Sun className="w-3 h-3 mr-1" /> : <Moon className="w-3 h-3 mr-1" />}
              {pageTheme === 'dark' ? 'Light' : 'Dark'}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" title="Editor theme">
                  <Palette className="w-3 h-3 mr-1" /> Editor Theme
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40">
                {['plantuml-dark','vs-dark','vs-light','hc-black','dracula','monokai','solarized-dark','solarized-light','github-dark','github-light'].map((t) => (
                  <DropdownMenuItem key={t} onClick={() => { setEditorTheme(t as any); try { localStorage.setItem('editor-theme', t); } catch {} }}>
                    {t}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <span>Cmd+K: files • Cmd+J: refresh • Cmd+B: toggle editor</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-block w-2 h-2 rounded-full ${isServerOnline ? 'bg-green-500' : isServerOnline === false ? 'bg-red-500' : 'bg-gray-400'} border border-editor-border`}
              aria-label={isServerOnline ? 'PlantUML server online' : isServerOnline === false ? 'PlantUML server offline' : 'PlantUML server status unknown'}
              title={isServerOnline ? 'Online' : isServerOnline === false ? 'Offline' : 'Checking...'}
            />
            <span>PlantUML Server {isServerOnline ? 'Online' : isServerOnline === false ? 'Offline' : 'Checking...'}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" title="Split orientation">
                  {splitOrientation === 'horizontal' ? 'Left/Right' : 'Top/Bottom'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setSplitOrientation('horizontal'); try { localStorage.setItem('split-orientation','horizontal'); } catch {} }}>Left / Right</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSplitOrientation('vertical'); try { localStorage.setItem('split-orientation','vertical'); } catch {} }}>Top / Bottom</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </footer>

      {/* Editor theme picker moved to footer */}

      {/* Command Palette for files (Cmd/Ctrl+K) */}
      <CommandDialog open={isFilePaletteOpen} onOpenChange={setIsFilePaletteOpen}>
        <Command>
          <CommandInput placeholder="Search files or type a command..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Files">
              {filesForPalette.map((f) => (
                <CommandItem
                  key={f.id}
                  value={f.id}
                  className="group rounded-md border border-transparent data-[selected=true]:bg-editor-background data-[selected=true]:border-editor-border data-[selected=true]:text-editor-text"
                  onSelect={async () => {
                  setIsFilePaletteOpen(false);
                  await handleSelectFile(f.id);
                }}
                >
                  <div className="flex items-center justify-between w-full gap-4">
                    <div className="truncate">
                      <div className="text-sm truncate">{f.name}</div>
                      <div className="text-[10px] text-muted-foreground group-data-[selected=true]:text-editor-comment">{new Date(f.updatedAt).toLocaleString()}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const confirmed = window.confirm(`Delete "${f.name}"? This cannot be undone.`);
                        if (!confirmed) return;
                        await deleteFile(f.id);
                        toast.success('Deleted file');
                        const list = await listFiles();
                        setFilesForPalette(list.map(ff => ({ id: ff.id, name: ff.name, updatedAt: ff.updatedAt })));
                        if (activeFileId === f.id) {
                          // If we deleted the active file, switch to the most recent one
                          if (list.length > 0) {
                            await handleSelectFile(list[0].id);
                          } else {
                            const created = await createFile('Untitled.puml', '@startuml\n@enduml\n');
                            await handleSelectFile(created.id);
                          }
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Actions">
              <CommandItem onSelect={async () => {
                const created = await createFile('Untitled.puml', '@startuml\n@enduml\n');
                await handleSelectFile(created.id);
                setIsFilePaletteOpen(false);
                toast.success('Created new file');
              }}>
                New file
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </div>
  );
};

export default Index;

import { useState, useEffect, useCallback } from "react";
import { PlantUMLEditor } from "@/components/PlantUMLEditor";
import { DiagramViewer } from "@/components/DiagramViewer";
import { ResizableLayout } from "@/components/ResizableLayout";
import { ensureDefault, getFile, updateFileContent, createFile, listFiles, renameFile, deleteFile } from "@/lib/fileStore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Moon, Sun, Palette, Settings, Maximize2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const Index = () => {
  const [plantUMLCode, setPlantUMLCode] = useState(`@startuml
title Sequence Demo with Section Viewsasdfsdf

' Common lifelines
actor User
participant "UI/Web App" as UI
participant "API Gateway" as APIGW
participant "Auth Service" as Auth
participant "App Service" as App
database "DB" as DB
queue "Event Bus" as Bus
participant "Email/SMS" as Notify

== System Overview ==
User -> UI : Clicks "Place Order"
UI -> APIGW : POST /orders
activate APIGW
APIGW -> Auth : Validate token
Auth --> APIGW : 200 OK (claims)
APIGW -> App : createOrder(request, claims)
activate App
App -> DB : INSERT order
DB --> App : orderId
App --> APIGW : 201 Created (orderId)
deactivate App
APIGW --> UI : 201 Created (orderId)
deactivate APIGW
UI --> User : Show confirmation

== Authentication Detail ==
group Token missing
  UI -> Auth : /oauth/authorize
  Auth --> UI : redirect(login)
  User -> Auth : submit credentials
  Auth --> UI : redirect with code
  UI -> Auth : /oauth/token (code)
  Auth --> UI : {access_token}
end

== Business Logic Breakdown ==
UI -> APIGW : POST /orders
APIGW -> App : createOrder(...)
activate App
App -> App : validateRequest()
alt Inventory available
  App -> DB : SELECT stock
  DB --> App : qty
  App -> DB : UPDATE reserve qty
else Out of stock
  App --> APIGW : 409 Conflict
  APIGW --> UI : 409 Conflict
  deactivate App
  return
end

== Data Access (DAO) ==
App -> DB : BEGIN
App -> DB : INSERT orders(...)
App -> DB : INSERT order_items(...)
App -> DB : COMMIT
DB --> App : OK

== Async Notifications ==
App -> Bus ++ : publish OrderCreated(orderId)
Bus -> Notify : deliver event
activate Notify
Notify -> User : send email/sms
deactivate Notify
App --> APIGW : 201 Created
APIGW --> UI : 201 Created

== Error & Retry ==
par Primary path
  UI -> APIGW : GET /orders/{id}
  APIGW -> App : fetchOrder(id)
  App -> DB : SELECT order by id
  DB --> App : row
  App --> APIGW : 200 OK
  APIGW --> UI : 200 OK
else DB timeout
  App -> DB : SELECT ...
  DB --> App : timeout
  App --> APIGW : 503 Service Unavailable
  APIGW --> UI : 503 Service Unavailable
  loop retry x3 with backoff
    App -> DB : SELECT ...
  end
end

== Cancellations & Lifeline Control ==
UI -> APIGW : DELETE /orders/{id}
APIGW -> App : cancelOrder(id)
activate App
App -> DB : UPDATE orders SET status='CANCELLED'
DB --> App : OK
destroy App
App --> APIGW : 204 No Content
APIGW --> UI : 204 No Content

== Cross-Diagram Reference ==
ref over APIGW,Auth : See "Authentication Detail" for token issuance
ref over App,DB : See "Data Access (DAO)" for transaction steps

@enduml
`);
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
  const [vimModeEnabled, setVimModeEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('plantuml-vim-mode');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  type KeyAction = 'toggleVim' | 'toggleLayout' | 'openFiles' | 'refresh' | 'toggleEditor';
  type KeyBinding = { meta: boolean; ctrl: boolean; alt: boolean; shift: boolean; code: string };
  const defaultKeyBindings: Record<KeyAction, KeyBinding> = {
    toggleVim: { meta: true, ctrl: false, alt: false, shift: true, code: 'KeyV' },
    toggleLayout: { meta: true, ctrl: false, alt: false, shift: false, code: 'KeyI' },
    openFiles: { meta: true, ctrl: false, alt: false, shift: false, code: 'KeyK' },
    refresh: { meta: true, ctrl: false, alt: false, shift: false, code: 'KeyJ' },
    toggleEditor: { meta: true, ctrl: false, alt: false, shift: false, code: 'KeyB' },
  };
  const [keyBindings, setKeyBindings] = useState<Record<KeyAction, KeyBinding>>(() => {
    try {
      const raw = localStorage.getItem('plantuml-keybindings');
      if (raw) {
        const parsed = JSON.parse(raw);
        const normalize = (kb: any, fallback: KeyBinding): KeyBinding => {
          const meta = !!kb?.meta;
          const alt = !!kb?.alt;
          const shift = !!kb?.shift;
          let code: string | undefined = typeof kb?.code === 'string' ? kb.code : undefined;
          if (!code) {
            const keyVal: string | undefined = typeof kb?.key === 'string' ? kb.key : undefined;
            if (keyVal) {
              if (/^[a-z]$/i.test(keyVal)) code = `Key${keyVal.toUpperCase()}`;
              else if (/^\d$/.test(keyVal)) code = `Digit${keyVal}`;
              else if (keyVal.toLowerCase() === 'enter') code = 'Enter';
              else if (keyVal.toLowerCase() === 'tab') code = 'Tab';
              else if (keyVal.toLowerCase() === 'space') code = 'Space';
              else if (keyVal.toLowerCase() === 'backspace') code = 'Backspace';
            }
          }
          return {
            meta,
            ctrl: false,
            alt,
            shift,
            code: code || fallback.code,
          };
        };
        return {
          toggleVim: normalize(parsed.toggleVim, defaultKeyBindings.toggleVim),
          toggleLayout: normalize(parsed.toggleLayout, defaultKeyBindings.toggleLayout),
          openFiles: normalize(parsed.openFiles, defaultKeyBindings.openFiles),
          refresh: normalize(parsed.refresh, defaultKeyBindings.refresh),
          toggleEditor: normalize(parsed.toggleEditor, defaultKeyBindings.toggleEditor),
        } as Record<KeyAction, KeyBinding>;
      }
    } catch {}
    return defaultKeyBindings;
  });
  const saveKeyBindings = (next: Record<KeyAction, KeyBinding>) => {
    setKeyBindings(next);
    try { localStorage.setItem('plantuml-keybindings', JSON.stringify(next)); } catch {}
  };
  const updateBindingPartial = (action: KeyAction, partial: Partial<KeyBinding>) => {
    const current = keyBindings[action];
    const updated: KeyBinding = {
      meta: partial.meta ?? current.meta,
      ctrl: false,
      alt: partial.alt ?? current.alt,
      shift: partial.shift ?? current.shift,
      code: (partial as any).code ?? current.code,
    };
    const next = { ...keyBindings, [action]: updated } as Record<KeyAction, KeyBinding>;
    saveKeyBindings(next);
  };
  const bindingToString = (b: KeyBinding) => {
    if (!b || typeof (b as any).code !== 'string' || (b as any).code === 'none') return 'None';
    const parts: string[] = [];
    if (b.meta) parts.push('Cmd');
    if (b.ctrl) parts.push('Ctrl');
    if (b.alt) parts.push('Alt');
    if (b.shift) parts.push('Shift');
    const c = b.code as string;
    if (c.startsWith('Key')) parts.push(c.slice(3));
    else if (c.startsWith('Digit')) parts.push(c.slice(5));
    else parts.push(c);
    return parts.join('+');
  };
  const matchesBinding = (e: KeyboardEvent, b: KeyBinding) => {
    if (!b || (b as any).code === 'none') return false;
    return (
      (!!e.metaKey) === (!!b.meta) &&
      (!!e.ctrlKey) === (!!b.ctrl) &&
      (!!e.altKey) === (!!b.alt) &&
      (!!e.shiftKey) === (!!b.shift) &&
      (e.code || '').toLowerCase() === b.code.toLowerCase()
    );
  };
  const [showFooterHints, setShowFooterHints] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('plantuml-show-footer-hints');
      return saved ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isKeybindsOpen, setIsKeybindsOpen] = useState(false);
  const [zenMode, setZenMode] = useState(false);

  const [showLeftPanel, setShowLeftPanel] = useState(() => {
    try {
      const saved = localStorage.getItem('plantuml-show-left-panel');
      return saved ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  type ServerMode = 'public' | 'custom';
  const [plantumlServerMode, setPlantumlServerMode] = useState<ServerMode>(() => {
    try {
      return (localStorage.getItem('plantuml-server-mode') as ServerMode) || 'custom';
    } catch {
      return 'custom';
    }
  });
  const [plantumlServerBase, setPlantumlServerBase] = useState<string>(() => {
    try {
      return localStorage.getItem('plantuml-server-base') || 'http://localhost:9090';
    } catch {
      return 'http://localhost:9090';
    }
  });
  const normalizedServerBase = (plantumlServerMode === 'custom' ? plantumlServerBase : 'https://www.plantuml.com/plantuml').replace(/\/$/, '');

  useEffect(() => {
    (async () => {
      const file = await ensureDefault(plantUMLCode);
      setActiveFileId(file.id);
      setActiveFileName(file.name);
      setPlantUMLCode(file.content);
      setRefreshTrigger((p) => p + 1);
    })();
  }, []);

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

  useEffect(() => {
    const check = async () => {
      const encoded = "SoWkIImgAStDuNBAJrBGjLDmpCbCJbMmKiX8pSd9pKi1";
      // Add timestamp to prevent caching
      const url = `${normalizedServerBase}/svg/${encoded}?t=${Date.now()}`;
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          cache: 'no-store',
        });
        
        clearTimeout(timeoutId);
        
        // Check if we got a valid response (2xx status)
        if (response.ok) {
          setIsServerOnline(true);
        } else {
          setIsServerOnline(false);
        }
      } catch (error) {
        // Any error (network, timeout, CORS, etc.) means server is offline
        setIsServerOnline(false);
      }
    };
    
    check();
    const id = setInterval(check, 15000); // Check every 15 seconds
    return () => clearInterval(id);
  }, [normalizedServerBase]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Handle Escape key to exit zen mode
    if (event.key === 'Escape' && zenMode) {
      event.preventDefault();
      setZenMode(false);
      return;
    }
    
    if (matchesBinding(event, keyBindings.toggleEditor)) {
      event.preventDefault();
      const newShowLeftPanel = !showLeftPanel;
      setShowLeftPanel(newShowLeftPanel);
      try { localStorage.setItem('plantuml-show-left-panel', JSON.stringify(newShowLeftPanel)); } catch {}
      return;
    }
    if (matchesBinding(event, keyBindings.toggleVim)) {
      event.preventDefault();
      const next = !vimModeEnabled;
      setVimModeEnabled(next);
      try { localStorage.setItem('plantuml-vim-mode', JSON.stringify(next)); } catch {}
      toast.success(`Vim mode ${next ? 'enabled' : 'disabled'}`);
      return;
    }
    if (matchesBinding(event, keyBindings.toggleLayout)) {
      event.preventDefault();
      const next = splitOrientation === 'horizontal' ? 'vertical' : 'horizontal';
      setSplitOrientation(next);
      try { localStorage.setItem('split-orientation', next); } catch {}
      toast.success(`Layout set to ${next === 'horizontal' ? 'Left/Right' : 'Top/Bottom'}`);
      return;
    }
    if (matchesBinding(event, keyBindings.openFiles)) {
      event.preventDefault();
      setIsFilePaletteOpen(true);
      (async () => {
        const list = await listFiles();
        setFilesForPalette(list.map(f => ({ id: f.id, name: f.name, updatedAt: f.updatedAt })));
      })();
      return;
    }
    if (matchesBinding(event, keyBindings.refresh)) {
      event.preventDefault();
      handleRefresh();
      return;
    }
  }, [showLeftPanel, vimModeEnabled, keyBindings, splitOrientation, zenMode]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="h-screen bg-gradient-background flex flex-col">

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor and Viewer */}
        <div className="flex-1">
          {(() => {
            const editorEl = (
              <PlantUMLEditor
                value={plantUMLCode}
                onChange={setPlantUMLCode}
                onRefresh={handleRefresh}
                editorTheme={editorTheme}
                vimModeEnabled={vimModeEnabled}
                zenMode={zenMode}
                editorOptions={{
                  renderWhitespace: 'selection',
                  guides: { indentation: true, bracketPairs: true },
                  cursorBlinking: 'smooth',
                  cursorSmoothCaretAnimation: 'on',
                  smoothScrolling: true,
                  tabSize: 2,
                  insertSpaces: true,
                  bracketPairColorization: { enabled: true },
                  formatOnPaste: false,
                  formatOnType: false,
                  wordBasedSuggestions: 'allDocuments',
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
                serverBase={normalizedServerBase}
                fileName={activeFileName}
                pageTheme={pageTheme}
                zenMode={zenMode}
                onExitZenMode={() => setZenMode(false)}
                isServerOnline={isServerOnline}
                serverMode={plantumlServerMode}
                onRenameFile={async (newName) => {
                  if (!activeFileId) return;
                  await renameFile(activeFileId, newName);
                  setActiveFileName(newName);
                }}
              />
            );
            const isVertical = splitOrientation === 'vertical';
            const layoutProps = isVertical
              ? (
                  showLeftPanel
                    ? { leftPanel: viewerEl, rightPanel: editorEl, hideLeftPanel: false as const }
                    : { leftPanel: null, rightPanel: viewerEl, hideLeftPanel: true as const }
                )
              : (
                  showLeftPanel
                    ? { leftPanel: editorEl, rightPanel: viewerEl, hideLeftPanel: false as const }
                    : { leftPanel: null, rightPanel: viewerEl, hideLeftPanel: true as const }
                );
            return (
              <ResizableLayout
                leftPanel={layoutProps.leftPanel}
                rightPanel={layoutProps.rightPanel}
                hideLeftPanel={layoutProps.hideLeftPanel}
                orientation={splitOrientation}
                storageKeyPrefix="plantuml-outer"
              />
            );
          })()}
        </div>
      </div>

      {/* Footer */}
      {!zenMode && (
      <footer className="bg-footer-bg border-t border-footer-border px-4 py-2">
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
            {showFooterHints && (
              <span>
                Files: {bindingToString(keyBindings.openFiles)} • Refresh: {bindingToString(keyBindings.refresh)} • Toggle editor: {bindingToString(keyBindings.toggleEditor)} • Vim: {bindingToString(keyBindings.toggleVim)} • Layout: {bindingToString(keyBindings.toggleLayout)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs"
                    onClick={() => setZenMode(true)}
                    title="Enter Zen Mode (hide header & footer)"
                  >
                    <Maximize2 className="w-3 h-3 mr-1" />
                    Zen Mode
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">Hide header & footer for distraction-free viewing</div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${isServerOnline ? 'bg-green-500' : isServerOnline === false ? 'bg-red-500' : 'bg-gray-400'} border border-editor-border`}
                    aria-label={isServerOnline ? 'PlantUML server online' : isServerOnline === false ? 'PlantUML server offline' : 'PlantUML server status unknown'}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs max-w-[280px] space-y-1">
                    <div>Renderer status: {isServerOnline ? 'Online' : isServerOnline === false ? 'Offline' : 'Checking…'}</div>
                    {isServerOnline === false && plantumlServerMode === 'custom' && (
                      <div className="text-editor-comment pt-1 border-t border-editor-border mt-1">
                        Local server unavailable. Switch to Public in Settings or start the local server.
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs">
                    {plantumlServerMode === 'public' ? 'Public' : 'Local'}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs max-w-[260px]">
                    {plantumlServerMode === 'public'
                      ? 'Using the public PlantUML server (https://www.plantuml.com/plantuml). This is best for quick previews.'
                      : `Using a local PlantUML server at ${plantumlServerBase}. Useful for offline or self-hosted rendering.`}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 rounded text-editor-comment hover:text-editor-text hover:bg-editor-background"
                    title={splitOrientation === 'horizontal' ? 'Switch to Top/Bottom' : 'Switch to Left/Right'}
                    aria-label={splitOrientation === 'horizontal' ? 'Switch to Top/Bottom' : 'Switch to Left/Right'}
                    onClick={() => {
                      const next = splitOrientation === 'horizontal' ? 'vertical' : 'horizontal';
                      setSplitOrientation(next);
                      try { localStorage.setItem('split-orientation', next); } catch {}
                    }}
                  >
                    <span className="inline-flex items-center justify-center w-6 h-6">
                      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" className="block">
                        <rect x="1.5" y="1.5" width="13" height="13" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        {splitOrientation === 'horizontal' ? (
                          <line x1="8" y1="3" x2="8" y2="13" stroke="currentColor" strokeWidth="1.5" />
                        ) : (
                          <line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="1.5" />
                        )}
                      </svg>
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">{splitOrientation === 'horizontal' ? 'Switch to Top/Bottom' : 'Switch to Left/Right'}</div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DropdownMenu open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" title="Settings">
                  <Settings className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="w-64">
                <DropdownMenuItem onClick={() => setIsKeybindsOpen(true)}>
                  Keyboard Shortcuts…
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5">
                  <div className="text-[11px] uppercase tracking-wide text-editor-comment mb-1">Renderer</div>
                  <div className="flex items-center gap-2 text-xs">
                    <Button size="sm" variant={plantumlServerMode === 'custom' ? 'secondary' : 'ghost'} onClick={() => { setPlantumlServerMode('custom'); try { localStorage.setItem('plantuml-server-mode','custom'); } catch {} }}>Local</Button>
                    <Button size="sm" variant={plantumlServerMode === 'public' ? 'secondary' : 'ghost'} onClick={() => { setPlantumlServerMode('public'); try { localStorage.setItem('plantuml-server-mode','public'); } catch {} }}>Public</Button>
                  </div>
                  {plantumlServerMode === 'custom' && (
                    <div className="mt-2 space-y-1">
                      <div className="text-[11px] text-editor-comment">Server base (e.g. http://localhost:9090)</div>
                      <Input
                        value={plantumlServerBase}
                        onChange={(e) => { setPlantumlServerBase(e.target.value); try { localStorage.setItem('plantuml-server-base', e.target.value); } catch {} }}
                        className="h-7 text-xs"
                        placeholder="http://localhost:9090"
                      />
                    </div>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  const next = !showFooterHints;
                  setShowFooterHints(next);
                  try { localStorage.setItem('plantuml-show-footer-hints', JSON.stringify(next)); } catch {}
                }}>
                  {showFooterHints ? 'Hide hints' : 'Show hints'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </footer>
      )}

      {/* Removed drawer sheet; right pane is inline below viewer */}

      {/* Keyboard Shortcuts Modal */}
      <Dialog open={isKeybindsOpen} onOpenChange={setIsKeybindsOpen}>
        <DialogContent className="max-w-[1000px]">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
            <DialogDescription>Select modifiers and a key. Changes save immediately.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <div className="font-medium">Toggle Vim mode</div>
                <div className="text-xs text-muted-foreground">Current: {bindingToString(keyBindings.toggleVim)}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox id="vim-cmd" checked={keyBindings.toggleVim.meta} onCheckedChange={(c) => updateBindingPartial('toggleVim', { meta: !!c })} />
                  <label htmlFor="vim-cmd" className="text-xs">Cmd</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="vim-alt" checked={keyBindings.toggleVim.alt} onCheckedChange={(c) => updateBindingPartial('toggleVim', { alt: !!c })} />
                  <label htmlFor="vim-alt" className="text-xs">Alt</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="vim-shift" checked={keyBindings.toggleVim.shift} onCheckedChange={(c) => updateBindingPartial('toggleVim', { shift: !!c })} />
                  <label htmlFor="vim-shift" className="text-xs">Shift</label>
                </div>
                <Select value={keyBindings.toggleVim.code} onValueChange={(v) => updateBindingPartial('toggleVim', { code: v })}>
                  <SelectTrigger className="h-7 w-28 text-xs"><SelectValue placeholder="Key" /></SelectTrigger>
                  <SelectContent className="text-xs">
                    {['KeyA','KeyB','KeyC','KeyD','KeyE','KeyF','KeyG','KeyH','KeyI','KeyJ','KeyK','KeyL','KeyM','KeyN','KeyO','KeyP','KeyQ','KeyR','KeyS','KeyT','KeyU','KeyV','KeyW','KeyX','KeyY','KeyZ','Digit0','Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9','Enter','Tab','Space','Backspace'].map(k => (
                      <SelectItem key={k} value={k}>{k.startsWith('Key') ? k.slice(3) : k.startsWith('Digit') ? k.slice(5) : k}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="ghost" onClick={() => { const next = { ...keyBindings, toggleVim: { meta:false, ctrl:false, alt:false, shift:false, code:'none' } }; saveKeyBindings(next); }}>Clear</Button>
                <Button size="sm" variant="ghost" onClick={() => { const next = { ...keyBindings, toggleVim: defaultKeyBindings.toggleVim }; saveKeyBindings(next); }}>Reset</Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <div className="font-medium">Toggle Layout</div>
                <div className="text-xs text-muted-foreground">Current: {bindingToString(keyBindings.toggleLayout)}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox id="layout-cmd" checked={keyBindings.toggleLayout.meta} onCheckedChange={(c) => updateBindingPartial('toggleLayout', { meta: !!c })} />
                  <label htmlFor="layout-cmd" className="text-xs">Cmd</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="layout-alt" checked={keyBindings.toggleLayout.alt} onCheckedChange={(c) => updateBindingPartial('toggleLayout', { alt: !!c })} />
                  <label htmlFor="layout-alt" className="text-xs">Alt</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="layout-shift" checked={keyBindings.toggleLayout.shift} onCheckedChange={(c) => updateBindingPartial('toggleLayout', { shift: !!c })} />
                  <label htmlFor="layout-shift" className="text-xs">Shift</label>
                </div>
                <Select value={keyBindings.toggleLayout.code} onValueChange={(v) => updateBindingPartial('toggleLayout', { code: v })}>
                  <SelectTrigger className="h-7 w-28 text-xs"><SelectValue placeholder="Key" /></SelectTrigger>
                  <SelectContent className="text-xs">
                    {['KeyA','KeyB','KeyC','KeyD','KeyE','KeyF','KeyG','KeyH','KeyI','KeyJ','KeyK','KeyL','KeyM','KeyN','KeyO','KeyP','KeyQ','KeyR','KeyS','KeyT','KeyU','KeyV','KeyW','KeyX','KeyY','KeyZ','Digit0','Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9','Enter','Tab','Space','Backspace'].map(k => (
                      <SelectItem key={k} value={k}>{k.startsWith('Key') ? k.slice(3) : k.startsWith('Digit') ? k.slice(5) : k}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="ghost" onClick={() => { const next = { ...keyBindings, toggleLayout: { meta:false, ctrl:false, alt:false, shift:false, code:'none' } }; saveKeyBindings(next); }}>Clear</Button>
                <Button size="sm" variant="ghost" onClick={() => { const next = { ...keyBindings, toggleLayout: defaultKeyBindings.toggleLayout }; saveKeyBindings(next); }}>Reset</Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <div className="font-medium">Open Files Palette</div>
                <div className="text-xs text-muted-foreground">Current: {bindingToString(keyBindings.openFiles)}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox id="files-cmd" checked={keyBindings.openFiles.meta} onCheckedChange={(c) => updateBindingPartial('openFiles', { meta: !!c })} />
                  <label htmlFor="files-cmd" className="text-xs">Cmd</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="files-alt" checked={keyBindings.openFiles.alt} onCheckedChange={(c) => updateBindingPartial('openFiles', { alt: !!c })} />
                  <label htmlFor="files-alt" className="text-xs">Alt</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="files-shift" checked={keyBindings.openFiles.shift} onCheckedChange={(c) => updateBindingPartial('openFiles', { shift: !!c })} />
                  <label htmlFor="files-shift" className="text-xs">Shift</label>
                </div>
                <Select value={keyBindings.openFiles.code} onValueChange={(v) => updateBindingPartial('openFiles', { code: v })}>
                  <SelectTrigger className="h-7 w-28 text-xs"><SelectValue placeholder="Key" /></SelectTrigger>
                  <SelectContent className="text-xs">
                    {['KeyA','KeyB','KeyC','KeyD','KeyE','KeyF','KeyG','KeyH','KeyI','KeyJ','KeyK','KeyL','KeyM','KeyN','KeyO','KeyP','KeyQ','KeyR','KeyS','KeyT','KeyU','KeyV','KeyW','KeyX','KeyY','KeyZ','Digit0','Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9','Enter','Tab','Space','Backspace'].map(k => (
                      <SelectItem key={k} value={k}>{k.startsWith('Key') ? k.slice(3) : k.startsWith('Digit') ? k.slice(5) : k}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="ghost" onClick={() => { const next = { ...keyBindings, openFiles: { meta:false, ctrl:false, alt:false, shift:false, code:'none' } }; saveKeyBindings(next); }}>Clear</Button>
                <Button size="sm" variant="ghost" onClick={() => { const next = { ...keyBindings, openFiles: defaultKeyBindings.openFiles }; saveKeyBindings(next); }}>Reset</Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <div className="font-medium">Refresh Diagram</div>
                <div className="text-xs text-muted-foreground">Current: {bindingToString(keyBindings.refresh)}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox id="refresh-cmd" checked={keyBindings.refresh.meta} onCheckedChange={(c) => updateBindingPartial('refresh', { meta: !!c })} />
                  <label htmlFor="refresh-cmd" className="text-xs">Cmd</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="refresh-alt" checked={keyBindings.refresh.alt} onCheckedChange={(c) => updateBindingPartial('refresh', { alt: !!c })} />
                  <label htmlFor="refresh-alt" className="text-xs">Alt</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="refresh-shift" checked={keyBindings.refresh.shift} onCheckedChange={(c) => updateBindingPartial('refresh', { shift: !!c })} />
                  <label htmlFor="refresh-shift" className="text-xs">Shift</label>
                </div>
                <Select value={keyBindings.refresh.code} onValueChange={(v) => updateBindingPartial('refresh', { code: v })}>
                  <SelectTrigger className="h-7 w-28 text-xs"><SelectValue placeholder="Key" /></SelectTrigger>
                  <SelectContent className="text-xs">
                    {['KeyA','KeyB','KeyC','KeyD','KeyE','KeyF','KeyG','KeyH','KeyI','KeyJ','KeyK','KeyL','KeyM','KeyN','KeyO','KeyP','KeyQ','KeyR','KeyS','KeyT','KeyU','KeyV','KeyW','KeyX','KeyY','KeyZ','Digit0','Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9','Enter','Tab','Space','Backspace'].map(k => (
                      <SelectItem key={k} value={k}>{k.startsWith('Key') ? k.slice(3) : k.startsWith('Digit') ? k.slice(5) : k}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="ghost" onClick={() => { const next = { ...keyBindings, refresh: { meta:false, ctrl:false, alt:false, shift:false, code:'none' } }; saveKeyBindings(next); }}>Clear</Button>
                <Button size="sm" variant="ghost" onClick={() => { const next = { ...keyBindings, refresh: defaultKeyBindings.refresh }; saveKeyBindings(next); }}>Reset</Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <div className="font-medium">Toggle Editor Panel</div>
                <div className="text-xs text-muted-foreground">Current: {bindingToString(keyBindings.toggleEditor)}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox id="editor-cmd" checked={keyBindings.toggleEditor.meta} onCheckedChange={(c) => updateBindingPartial('toggleEditor', { meta: !!c })} />
                  <label htmlFor="editor-cmd" className="text-xs">Cmd</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="editor-alt" checked={keyBindings.toggleEditor.alt} onCheckedChange={(c) => updateBindingPartial('toggleEditor', { alt: !!c })} />
                  <label htmlFor="editor-alt" className="text-xs">Alt</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="editor-shift" checked={keyBindings.toggleEditor.shift} onCheckedChange={(c) => updateBindingPartial('toggleEditor', { shift: !!c })} />
                  <label htmlFor="editor-shift" className="text-xs">Shift</label>
                </div>
                <Select value={keyBindings.toggleEditor.code} onValueChange={(v) => updateBindingPartial('toggleEditor', { code: v })}>
                  <SelectTrigger className="h-7 w-28 text-xs"><SelectValue placeholder="Key" /></SelectTrigger>
                  <SelectContent className="text-xs">
                    {['KeyA','KeyB','KeyC','KeyD','KeyE','KeyF','KeyG','KeyH','KeyI','KeyJ','KeyK','KeyL','KeyM','KeyN','KeyO','KeyP','KeyQ','KeyR','KeyS','KeyT','KeyU','KeyV','KeyW','KeyX','KeyY','KeyZ','Digit0','Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9','Enter','Tab','Space','Backspace'].map(k => (
                      <SelectItem key={k} value={k}>{k.startsWith('Key') ? k.slice(3) : k.startsWith('Digit') ? k.slice(5) : k}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="ghost" onClick={() => { const next = { ...keyBindings, toggleEditor: { meta:false, ctrl:false, alt:false, shift:false, code:'none' } }; saveKeyBindings(next); }}>Clear</Button>
                <Button size="sm" variant="ghost" onClick={() => { const next = { ...keyBindings, toggleEditor: defaultKeyBindings.toggleEditor }; saveKeyBindings(next); }}>Reset</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

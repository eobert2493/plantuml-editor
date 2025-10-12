import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Copy, FileText, Download } from "lucide-react";
import Editor, { OnMount } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { plantuml, plantumlCompletionSource } from "@/lib/plantuml-lang";

interface PlantUMLEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRefresh?: () => void;
  activeTab?: 'full' | 'setup' | 'sequence';
  onTabChange?: (tab: 'full' | 'setup' | 'sequence') => void;
  hasSetupContent?: boolean;
  hasSequenceContent?: boolean;
  editorTheme?: 'vs-dark' | 'vs-light' | 'hc-black' | 'plantuml-dark' | 'dracula' | 'monokai' | 'solarized-dark' | 'solarized-light' | 'github-dark' | 'github-light';
  editorOptions?: Partial<monaco.editor.IStandaloneEditorConstructionOptions>;
  vimModeEnabled?: boolean;
  zenMode?: boolean;
}

interface CodeSection {
  name: string;
  startMarkers: string[];
  endMarkers: string[];
  icon: string;
}

export const PlantUMLEditor = ({ value, onChange, onRefresh, activeTab = 'full', onTabChange, hasSetupContent = false, hasSequenceContent = false, editorTheme = 'plantuml-dark', editorOptions = {}, vimModeEnabled = false, zenMode = false }: PlantUMLEditorProps) => {
  
  // Define code sections
  const codeSections: Record<string, CodeSection> = {
    setup: {
      name: 'Setup',
      startMarkers: ['@startuml', 'participant', 'actor', 'boundary', 'control', 'entity', 'database', 'collections', 'queue', 'box', 'title', 'skinparam', 'note', 'legend'],
      endMarkers: ['->', '<-', '-->', '<--', '..>', '<..'],
      icon: 'settings'
    },
    sequence: {
      name: 'Sequence',
      startMarkers: ['->', '<-', '-->', '<--', '..>', '<..', 'activate', 'deactivate', 'note', 'alt', 'else', 'opt', 'loop', 'par', 'break'],
      endMarkers: ['@enduml'],
      icon: 'flow'
    }
  };

  // Removed line count from header to keep UI minimal


  // Monaco editor and Vim adapter refs
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const vimAdapterRef = useRef<{ dispose: () => void } | null>(null);
  const vimStatusRef = useRef<HTMLDivElement | null>(null);

  // Parse content based on active tab
  const getDisplayContent = useCallback(() => {
    if (activeTab === 'full') {
      return value;
    }

    const lines = value.split('\n');
    let displayLines: string[] = [];

    if (activeTab === 'setup') {
      // Include @startuml and setup elements
      for (const line of lines) {
        const trimmed = line.trim();
        
        if (trimmed.startsWith('@startuml') || 
            trimmed.startsWith('title') ||
            trimmed.startsWith('participant') ||
            trimmed.startsWith('actor') ||
            trimmed.startsWith('boundary') ||
            trimmed.startsWith('control') ||
            trimmed.startsWith('entity') ||
            trimmed.startsWith('database') ||
            trimmed.startsWith('collections') ||
            trimmed.startsWith('queue') ||
            trimmed.startsWith('box') ||
            trimmed.startsWith('end box') ||
            trimmed.startsWith('skinparam') ||
            trimmed.startsWith('note') && !trimmed.includes('->') ||
            trimmed.startsWith('legend') ||
            trimmed.startsWith('!') ||
            trimmed === '' ||
            trimmed.startsWith("'")) {
          displayLines.push(line);
        } else if (trimmed.includes('->') || trimmed.includes('<-')) {
          // Stop at first sequence interaction
          break;
        }
      }
      displayLines.push('@enduml');
      
    } else if (activeTab === 'sequence') {
      // Extract and preserve setup context (participants, boxes, etc.)
      const setupLines: string[] = [];
      let sequenceLines: string[] = [];
      
      displayLines.push('@startuml');
      
      // First pass: collect setup elements
      for (const line of lines) {
        const trimmed = line.trim();
        
        if (trimmed.startsWith('title') ||
            trimmed.startsWith('participant') ||
            trimmed.startsWith('actor') ||
            trimmed.startsWith('boundary') ||
            trimmed.startsWith('control') ||
            trimmed.startsWith('entity') ||
            trimmed.startsWith('database') ||
            trimmed.startsWith('collections') ||
            trimmed.startsWith('queue') ||
            trimmed.startsWith('box') ||
            trimmed.startsWith('end box') ||
            trimmed.startsWith('skinparam') ||
            trimmed.startsWith('!') ||
            (trimmed.startsWith('note') && !trimmed.includes('->') && !trimmed.includes('of') && !trimmed.includes('over'))) {
          setupLines.push(line);
        }
      }
      
      // Add setup lines first
      displayLines.push(...setupLines);
      if (setupLines.length > 0) {
        displayLines.push(''); // Empty line separator
      }
      
      // Second pass: collect sequence interactions
      for (const line of lines) {
        const trimmed = line.trim();
        
        // Include sequence interactions and flow control
        if (trimmed.includes('->') || 
            trimmed.includes('<-') ||
            trimmed.startsWith('activate') ||
            trimmed.startsWith('deactivate') ||
            trimmed.startsWith('note') && (trimmed.includes('->') || trimmed.includes('of') || trimmed.includes('over')) ||
            trimmed.startsWith('alt') ||
            trimmed.startsWith('else') ||
            trimmed.startsWith('opt') ||
            trimmed.startsWith('loop') ||
            trimmed.startsWith('par') ||
            trimmed.startsWith('break') ||
            trimmed.startsWith('critical') ||
            trimmed.startsWith('group') ||
            trimmed.startsWith('end') ||
            trimmed.startsWith('==') ||
            (trimmed === '' && sequenceLines.length > 0)) { // Empty lines only after we've started adding content
          if (!trimmed.startsWith('@enduml')) {
            sequenceLines.push(line);
          }
        }
      }
      
      displayLines.push(...sequenceLines);
      displayLines.push('@enduml');
    }

    return displayLines.join('\n');
  }, [value, activeTab]);

  const handleEditorMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor;
    // Basic PlantUML language registration for Monaco
    const languageId = 'plantuml';
    monacoInstance.languages.register({ id: languageId });
    monacoInstance.languages.setMonarchTokensProvider(languageId, {
      tokenizer: {
        root: [
          [/^'.*$/, 'comment'],
          [/^@(?:start|end)\w+/, 'keyword'],
          [/(title|participant|actor|boundary|control|entity|database|collections|queue|note|box|end box|legend|skinparam|autonumber|alt|else|opt|loop|par|break|critical|activate|deactivate|create|destroy|return)\b/, 'keyword'],
          [/"([^"\\]|\\.)*"/, 'string'],
          [/#?[0-9a-fA-F]{6}\b/, 'number'],
          [/(-+>|<-+|\.\.+>|<\.\.|\|+>|<\|+|o+>|<o+|\*+>|<\*+|\\+>|<\\+|\/+>|<\/+)/, 'operator'],
        ],
      },
    });

    // Completions: keywords + simple snippets based on our CM source
    const keywordSuggestions = [
      '@startuml', '@enduml', 'title', 'participant', 'actor', 'boundary', 'control', 'entity', 'database',
      'collections', 'queue', 'note', 'box', 'end box', 'legend', 'skinparam', 'autonumber', 'alt', 'else', 'opt', 'loop', 'par', 'break', 'return'
    ].map(label => ({
      label,
      kind: monacoInstance.languages.CompletionItemKind.Keyword,
      insertText: label,
    }));

    const snippetSuggestions = [
      {
        label: '@startuml…@enduml',
        kind: monacoInstance.languages.CompletionItemKind.Snippet,
        insertText: '@startuml\n$1\n@enduml',
        insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      },
      {
        label: 'participant',
        kind: monacoInstance.languages.CompletionItemKind.Snippet,
        insertText: 'participant "${1:Name}" as ${2:Alias}',
        insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      },
      {
        label: 'box',
        kind: monacoInstance.languages.CompletionItemKind.Snippet,
        insertText: 'box ${1:Name}\n  $2\nend box',
        insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      },
      {
        label: 'alt/else/end',
        kind: monacoInstance.languages.CompletionItemKind.Snippet,
        insertText: 'alt ${1:Condition}\n  $2\nelse ${3:Otherwise}\n  $4\nend',
        insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      },
    ];

    monacoInstance.languages.registerCompletionItemProvider(languageId, {
      triggerCharacters: [' ', '\n', '[', '(', '<', ':'],
      provideCompletionItems: async () => {
        const suggestions = [...keywordSuggestions, ...snippetSuggestions];
        return { suggestions };
      },
    });

    // Themes
    monacoInstance.editor.defineTheme('plantuml-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6b7280' },
        { token: 'keyword', foreground: '93c5fd' },
        { token: 'string', foreground: '86efac' },
        { token: 'number', foreground: 'fde68a' },
        { token: 'operator', foreground: 'a5b4fc' },
      ],
      colors: {
        'editor.background': '#0b0f14',
        'editorLineNumber.foreground': '#4b5563',
        'editorLineNumber.activeForeground': '#93c5fd',
        'editorCursor.foreground': '#93c5fd',
        'editorIndentGuide.background': '#1f2937',
      },
    });
    monacoInstance.editor.defineTheme('dracula', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6272a4' },
        { token: 'keyword', foreground: 'ff79c6' },
        { token: 'string', foreground: 'f1fa8c' },
        { token: 'number', foreground: 'bd93f9' },
        { token: 'operator', foreground: '8be9fd' },
      ],
      colors: { 'editor.background': '#282a36' },
    });
    monacoInstance.editor.defineTheme('monokai', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '75715e' },
        { token: 'keyword', foreground: 'f92672' },
        { token: 'string', foreground: 'e6db74' },
        { token: 'number', foreground: 'ae81ff' },
        { token: 'operator', foreground: '66d9ef' },
      ],
      colors: { 'editor.background': '#272822' },
    });
    monacoInstance.editor.defineTheme('solarized-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '586e75' },
        { token: 'keyword', foreground: '859900' },
        { token: 'string', foreground: '2aa198' },
        { token: 'number', foreground: 'b58900' },
        { token: 'operator', foreground: '268bd2' },
      ],
      colors: { 'editor.background': '#002b36' },
    });
    monacoInstance.editor.defineTheme('solarized-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '93a1a1' },
        { token: 'keyword', foreground: '859900' },
        { token: 'string', foreground: '2aa198' },
        { token: 'number', foreground: 'b58900' },
        { token: 'operator', foreground: '268bd2' },
      ],
      colors: { 'editor.background': '#fdf6e3' },
    });
    monacoInstance.editor.defineTheme('github-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '8b949e' },
        { token: 'keyword', foreground: 'ff7b72' },
        { token: 'string', foreground: 'a5d6ff' },
        { token: 'number', foreground: 'ffa657' },
        { token: 'operator', foreground: '79c0ff' },
      ],
      colors: { 'editor.background': '#0d1117' },
    });
    monacoInstance.editor.defineTheme('github-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6e7781' },
        { token: 'keyword', foreground: 'cf222e' },
        { token: 'string', foreground: '0a3069' },
        { token: 'number', foreground: '953800' },
        { token: 'operator', foreground: '0550ae' },
      ],
      colors: { 'editor.background': '#ffffff' },
    });
    monacoInstance.editor.setTheme(editorTheme || 'plantuml-dark');

    // Set language on the model
    const model = editor.getModel();
    if (model) monacoInstance.editor.setModelLanguage(model, languageId);
  };

  // Initialize or dispose Vim mode when toggled
  useEffect(() => {
    const editor = editorRef.current;
    // Dispose any existing adapter first if toggling off or re-initializing
    if (!vimModeEnabled && vimAdapterRef.current) {
      try { vimAdapterRef.current.dispose(); } catch {}
      vimAdapterRef.current = null;
    }

    if (vimModeEnabled && editor) {
      let cancelled = false;
      (async () => {
        try {
          const mod: any = await import('monaco-vim');
          if (cancelled) return;
          const init = (mod && (mod.initVimMode || mod.default?.initVimMode)) || mod?.default || mod?.createVimMode || mod?.init;
          if (typeof init === 'function') {
            const statusEl = vimStatusRef.current ?? undefined;
            const adapter = init(editor, statusEl);
            // Some variants return { dispose }, others return an object with different shape; keep best-effort
            if (adapter && typeof adapter.dispose === 'function') {
              vimAdapterRef.current = adapter;
            } else {
              // Fallback no-op disposer
              vimAdapterRef.current = { dispose: () => {} };
            }
          }
        } catch (e) {
          // If monaco-vim fails to load, ensure we don't keep a broken state
          vimAdapterRef.current = null;
        }
      })();
      return () => { cancelled = true; };
    }

    return () => {};
  }, [vimModeEnabled]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'j') {
      event.preventDefault();
      if (onRefresh) {
        onRefresh();
      }
    }
  }, [onRefresh]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleExport = () => {
    const blob = new Blob([value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diagram.puml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("PlantUML file exported!");
  };

  return (
    <Card className="h-full bg-editor-panel border-editor-border flex flex-col">
      {!zenMode && (
        <div className="flex items-center justify-between p-3 border-b border-editor-border">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-editor-keyword" />
            <h3 className="text-sm font-medium text-editor-text">PlantUML Editor</h3>
          </div>
          <div className="flex items-center gap-2">
            <div ref={vimStatusRef} className="text-[10px] text-editor-comment min-w-[40px] text-right">
              {vimModeEnabled ? 'VIM' : ''}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-8 w-8 p-0 text-editor-comment hover:text-editor-text hover:bg-editor-background"
            >
              <Copy className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExport}
              className="h-8 w-8 p-0 text-editor-comment hover:text-editor-text hover:bg-editor-background"
            >
              <Download className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-hidden">
        <Editor
          value={activeTab === 'full' ? value : getDisplayContent()}
          onChange={(val) => {
            if (activeTab === 'full' && typeof val === 'string') {
              onChange(val);
            }
          }}
          beforeMount={(monacoInstance) => {
            // Provide monaco globally for worker config if needed
            (window as any).MonacoEnvironment = { getWorkerUrl: () => './editor.worker.js' };
          }}
          onMount={handleEditorMount}
          language="plantuml"
          theme={editorTheme}
          options={{
            fontSize: 14,
            fontFamily: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'off',
            lineNumbers: 'on',
            readOnly: activeTab !== 'full',
            automaticLayout: true,
            ...editorOptions,
            // Ensure readOnly follows activeTab even if overridden
            readOnly: activeTab !== 'full',
          }}
          height="100%"
        />
      </div>
    </Card>
  );
};
import { useState, useEffect, useRef } from "react";

interface FileNameOverlayProps {
  fileName: string | null;
  onRenameFile?: (newName: string) => Promise<void> | void;
}

export const FileNameOverlay = ({ fileName, onRenameFile }: FileNameOverlayProps) => {
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

  return (
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
  );
};


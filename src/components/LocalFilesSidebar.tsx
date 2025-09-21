import { useEffect, useMemo, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FilePlus, MoreHorizontal, Save, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  createFile,
  deleteFile,
  duplicateFile,
  exportFile,
  listFiles,
  renameFile,
  FileMetadata,
} from "@/lib/fileStore";

interface LocalFilesSidebarProps {
  activeFileId: string | null;
  onSelectFile: (id: string) => void;
  onActiveFileRenamed?: (newName: string) => void;
}

export const LocalFilesSidebar = ({ activeFileId, onSelectFile, onActiveFileRenamed }: LocalFilesSidebarProps) => {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [filter, setFilter] = useState("");
  const [isRenamingId, setIsRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const refreshList = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await listFiles();
      setFiles(list);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const base = q ? files.filter((f) => f.name.toLowerCase().includes(q)) : files;
    return [...base].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [files, filter]);

  const handleCreate = async () => {
    const res = await createFile("Untitled.puml", "@startuml\n@enduml\n");
    toast.success("Created file");
    await refreshList();
    onSelectFile(res.id);
  };

  const handleDuplicate = async (id: string) => {
    const res = await duplicateFile(id);
    if (res) {
      toast.success("Duplicated file");
      await refreshList();
      onSelectFile(res.id);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteFile(id);
    toast.success("Deleted file");
    await refreshList();
  };

  const handleExport = async (id: string) => {
    const res = await exportFile(id);
    if (!res) return;
    const blob = new Blob([res.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = res.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Exported .puml");
  };

  const startRename = (f: FileMetadata) => {
    setIsRenamingId(f.id);
    setRenameValue(f.name);
  };

  const commitRename = async () => {
    const id = isRenamingId;
    const name = renameValue.trim();
    if (!id) return;
    if (!name) {
      toast.error("Name required");
      return;
    }
    await renameFile(id, name);
    toast.success("Renamed");
    if (id === activeFileId && onActiveFileRenamed) {
      onActiveFileRenamed(name);
    }
    setIsRenamingId(null);
    await refreshList();
  };

  return (
    <Card className="bg-editor-panel border-editor-border h-full flex flex-col">
      <div className="p-3 border-b border-editor-border flex items-center gap-2">
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search files..."
          className="h-8 text-xs"
        />
        <Button variant="secondary" size="sm" className="h-8" onClick={handleCreate}>
          <FilePlus className="w-3 h-3 mr-1" /> New
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading && (
            <div className="text-xs text-editor-comment px-2 py-1">Loading...</div>
          )}
          {filtered.map((f) => (
            <div
              key={f.id}
              className={`group flex items-center justify-between px-2 py-1 rounded border ${activeFileId === f.id ? 'border-primary bg-editor-background' : 'border-transparent hover:border-editor-border hover:bg-editor-background'}`}
            >
              <button
                className="text-left flex-1 overflow-hidden"
                onClick={() => onSelectFile(f.id)}
                title={f.name}
              >
                {isRenamingId === f.id ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="h-7 text-xs"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename();
                        if (e.key === 'Escape') setIsRenamingId(null);
                      }}
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={commitRename}>
                      <Save className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsRenamingId(null)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="truncate text-sm text-editor-text">{f.name}</div>
                )}
                <div className="text-[10px] text-editor-comment truncate">
                  {new Date(f.updatedAt).toLocaleString()}
                </div>
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-7 w-7" title="More">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => startRename(f)}>Rename</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDuplicate(f.id)}>Duplicate</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport(f.id)}>Export .puml</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(f.id)}>Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
          {filtered.length === 0 && !isLoading && (
            <div className="text-xs text-editor-comment px-2 py-2">No files</div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};



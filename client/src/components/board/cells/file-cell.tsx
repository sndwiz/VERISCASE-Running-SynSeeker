import { useState } from "react";
import { Paperclip, Upload, X, FileText, Image, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { FileAttachment } from "@shared/schema";

interface FileCellProps {
  value: FileAttachment[];
  onChange: (value: FileAttachment[]) => void;
  onClick?: (e: React.MouseEvent) => void;
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return Image;
  if (type.includes("pdf") || type.includes("doc")) return FileText;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileCell({ value = [], onChange, onClick }: FileCellProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleRemoveFile = (fileId: string) => {
    onChange(value.filter((f) => f.id !== fileId));
  };

  const handleAddFile = () => {
    const newFile: FileAttachment = {
      id: `file-${Date.now()}`,
      name: `Document ${value.length + 1}.pdf`,
      url: "#",
      type: "application/pdf",
      size: Math.floor(Math.random() * 1024 * 1024),
      uploadedAt: new Date().toISOString(),
      uploadedBy: "current-user",
    };
    onChange([...value, newFile]);
  };

  const fileCount = value.length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-2 px-2 py-1 rounded hover-elevate text-sm w-full justify-start"
          onClick={onClick}
          data-testid="cell-files"
        >
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          {fileCount > 0 ? (
            <span className="text-muted-foreground">{fileCount}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Files</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddFile}
              data-testid="button-add-file"
            >
              <Upload className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>
          
          {value.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              No files attached
            </div>
          ) : (
            <div className="space-y-1 max-h-48 overflow-auto">
              {value.map((file) => {
                const Icon = getFileIcon(file.type);
                return (
                  <div
                    key={file.id}
                    className="flex items-center gap-2 p-2 rounded-md bg-muted/50 group"
                    data-testid={`file-${file.id}`}
                  >
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={() => handleRemoveFile(file.id)}
                      data-testid={`button-remove-file-${file.id}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

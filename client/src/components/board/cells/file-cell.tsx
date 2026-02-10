import { useState, useRef } from "react";
import { Paperclip, Upload, X, FileText, Image, File, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import type { FileAttachment } from "@shared/schema";

interface FileCellProps {
  value: FileAttachment[];
  onChange: (value: FileAttachment[]) => void;
  onClick?: (e: React.MouseEvent) => void;
  taskId?: string;
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

export function FileCell({ value = [], onChange, onClick, taskId }: FileCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleRemoveFile = (fileId: string) => {
    onChange(value.filter((f) => f.id !== fileId));
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (taskId) {
      setIsUploading(true);
      try {
        for (const file of Array.from(files)) {
          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch(`/api/tasks/${taskId}/files`, {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Upload failed");
          }

          const fileRecord = await response.json();
          onChange([...value, {
            id: fileRecord.id,
            name: fileRecord.name,
            url: fileRecord.path || "#",
            type: fileRecord.mimeType,
            size: fileRecord.size,
            uploadedAt: fileRecord.uploadedAt,
            uploadedBy: "current-user",
          }]);
        }
        toast({ title: "File uploaded", description: "File attached to task successfully." });
      } catch (err: any) {
        toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      } finally {
        setIsUploading(false);
      }
    } else {
      for (const file of Array.from(files)) {
        const newFile: FileAttachment = {
          id: `file-${Date.now()}`,
          name: file.name,
          url: "#",
          type: file.type || "application/octet-stream",
          size: file.size,
          uploadedAt: new Date().toISOString(),
          uploadedBy: "current-user",
        };
        onChange([...value, newFile]);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
          <div className="flex items-center justify-between gap-1">
            <h4 className="text-sm font-medium">Files</h4>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              data-testid="input-file-upload"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              data-testid="button-add-file"
            >
              {isUploading ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Upload className="h-3 w-3 mr-1" />
              )}
              {isUploading ? "Uploading..." : "Upload"}
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

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface TextCellProps {
  value: string;
  onChange: (value: string) => void;
  onClick?: (e: React.MouseEvent) => void;
}

export function TextCell({ value, onChange, onClick }: TextCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue !== value) {
      onChange(editValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleBlur();
    }
    if (e.key === "Escape") {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="h-7 text-xs"
        onClick={onClick}
        data-testid="text-cell-input"
      />
    );
  }

  return (
    <button
      className="w-full h-7 px-2 py-1 text-xs text-left truncate text-muted-foreground hover-elevate rounded"
      onClick={(e) => {
        onClick?.(e);
        setIsEditing(true);
      }}
      data-testid="text-cell"
    >
      {value || <span className="opacity-50">-</span>}
    </button>
  );
}

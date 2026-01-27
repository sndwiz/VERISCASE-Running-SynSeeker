import { useState } from "react";
import { format, parseISO, isValid, isPast, isToday } from "date-fns";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateCellProps {
  value: string | null;
  onChange: (value: string | null) => void;
  onClick?: (e: React.MouseEvent) => void;
}

export function DateCell({ value, onChange, onClick }: DateCellProps) {
  const [open, setOpen] = useState(false);

  const date = value ? parseISO(value) : null;
  const isValidDate = date && isValid(date);
  const isOverdue = isValidDate && isPast(date) && !isToday(date);

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      onChange(format(selectedDate, "yyyy-MM-dd"));
    } else {
      onChange(null);
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`w-full h-7 px-2 text-xs font-normal justify-start ${
            isOverdue
              ? "text-red-600 dark:text-red-400"
              : isValidDate && isToday(date)
              ? "text-blue-600 dark:text-blue-400"
              : "text-muted-foreground"
          }`}
          onClick={onClick}
          data-testid="date-cell"
        >
          <Calendar className="h-3 w-3 mr-1" />
          {isValidDate ? format(date, "MMM d") : "Set date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <CalendarComponent
          mode="single"
          selected={isValidDate ? date : undefined}
          onSelect={handleSelect}
          initialFocus
        />
        {value && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              data-testid="button-clear-date"
            >
              Clear date
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

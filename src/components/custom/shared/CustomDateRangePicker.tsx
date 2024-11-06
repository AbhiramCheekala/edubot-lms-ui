import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DateRange {
  from: Date;
  to?: Date;
}

interface CustomDateRangePickerProps {
  onSelect: (range: DateRange) => void;
}

const CustomDateRangePicker: React.FC<CustomDateRangePickerProps> = ({ onSelect }) => {
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [isSelectingEndDate, setIsSelectingEndDate] = useState(false);

  const handleSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) return;

    if (!dateRange || !isSelectingEndDate) {
      // Selecting start date
      setDateRange({ from: selectedDate, to: undefined });
      setIsSelectingEndDate(true);
    } else {
      // Selecting end date
      if (selectedDate >= dateRange.from) {
        const newRange = { from: dateRange.from, to: selectedDate };
        setDateRange(newRange);
        onSelect(newRange);
        setIsSelectingEndDate(false);
      } else {
        // If selected end date is before start date, set it as new start date
        setDateRange({ from: selectedDate, to: undefined });
        setIsSelectingEndDate(true);
      }
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          {dateRange?.from ? (
            dateRange.to ? (
              <>
                {format(dateRange.from, "LLL dd, y")} -{" "}
                {format(dateRange.to, "LLL dd, y")}
              </>
            ) : (
              format(dateRange.from, "LLL dd, y")
            )
          ) : (
            <span>Pick a date range</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <ScrollArea className="h-80">
          <div className="p-4 bg-white">
            <Calendar
              mode="single"
              selected={isSelectingEndDate ? dateRange?.to : dateRange?.from}
              onSelect={handleSelect}
              initialFocus
              disabled={(date) => 
                isSelectingEndDate && dateRange ? date < dateRange.from : false
              }
            />
          </div>
        </ScrollArea>
        <div className="p-4 bg-white border-t">
          <p className="text-sm text-gray-500 mb-2">
            {isSelectingEndDate
              ? "Select end date"
              : dateRange?.from
              ? "Select start date to change range"
              : "Select start date"}
          </p>
          {dateRange?.from && !dateRange.to && (
            <Button 
              onClick={() => {
                if (dateRange.from) {
                  const newRange = { from: dateRange.from, to: dateRange.from };
                  setDateRange(newRange);
                  onSelect(newRange);
                  setIsSelectingEndDate(false);
                }
              }}
            >
              Use Single Date
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default CustomDateRangePicker;
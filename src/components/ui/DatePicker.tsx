import React from "react";
import { useForm, Controller } from "react-hook-form";
import { CalendarIcon } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@radix-ui/react-popover";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar"; // Update the path accordingly

const DatePickerForm = ({ control, name }) => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, value } }) => (
        <div className="relative tw-mb-1">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="tw-w-full tw-px-4 tw-py-2 tw-text-left tw-font-normal tw-border tw-border-gray-300 tw-rounded-md"
                onClick={(e) => e.stopPropagation()} // Prevent closing Popover on button click
              >
                {value ? format(new Date(value), "dd/MM/yyyy") : "Pick a date"}
                <CalendarIcon className="tw-ml-auto tw-h-4 tw-w-4 tw-opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="tw-w-auto tw-p-0">
              <Calendar
                mode="single"
                selected={value}
                onSelect={onChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    />
  );
};

// Usage example
const ExampleForm = () => {
  const { control, handleSubmit } = useForm({
    defaultValues: {
      date: new Date(),
    },
  });

  const onSubmit = (data) => {
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="tw-space-y-4">
      <DatePickerForm control={control} name="date" />
      <button type="submit" className="tw-bg-blue-500 tw-text-white tw-px-4 tw-py-2 tw-rounded-md tw-font-semibold">
        Submit
      </button>
    </form>
  );
};

export default ExampleForm;

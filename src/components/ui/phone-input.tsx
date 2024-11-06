import { CheckIcon, ChevronsUpDown } from "lucide-react";
import * as React from "react";
import PhoneNumberInput, {
  Country,
  isValidPhoneNumber,
  getCountryCallingCode,
  Value,
} from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input, InputProps } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// Type for PhoneInput props
type PhoneInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "value"
> &
  Omit<React.ComponentProps<typeof PhoneNumberInput>, "onChange"> & {
    onChange?: (value: Value) => void;
    onError?: (error: string) => void; // Optional error handler
  };

// Default country code for India
const DEFAULT_COUNTRY: Country = "IN";

const PhoneInput: React.ForwardRefExoticComponent<PhoneInputProps> =
  React.forwardRef<React.ElementRef<typeof PhoneNumberInput>, PhoneInputProps>(
    ({ className, onChange, onError, ...props }, ref) => {
      const [error, setError] = React.useState<string | null>(null);

      const handleChange = (value: Value) => {
        if (!value) {
          setError(null);
          onChange?.(value);
          return;
        }

        // Validate phone number
        const isValid = isValidPhoneNumber(value);
        if (!isValid) {
          const errorMessage = "Invalid phone number";
          setError(errorMessage);
          if (onError) onError(errorMessage);
        } else {
          setError(null);
          onChange?.(value);
        }
      };

      return (
        <div className="tw-relative">
          <PhoneNumberInput
            ref={ref}
            className={cn("tw-flex", className)}
            flagComponent={FlagComponent}
            countrySelectComponent={CountrySelect}
            inputComponent={InputComponent}
            defaultCountry={DEFAULT_COUNTRY}
            onChange={handleChange}
            {...props}
          />
          {error && (
            <div className="tw-absolute tw-text-red-500 tw-text-sm tw-mt-1">
              {error}
            </div>
          )}
        </div>
      );
    }
  );
PhoneInput.displayName = "PhoneInput";

// Input component with Tailwind CSS
const InputComponent = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <Input
      className={cn(
        "tw-w-full tw-px-4 tw-py-2 tw-text-left tw-font-normal tw-border tw-border-border tw-rounded-md tw-rounded-s-none tw-rounded-e-sm tw-border-l-0",
        className
      )}
      {...props}
      ref={ref}
    />
  )
);
InputComponent.displayName = "InputComponent";

// CountrySelect component
type CountrySelectOption = { label: string; value: Country };

type CountrySelectProps = {
  disabled?: boolean;
  value: Country;
  onChange: (value: Country) => void;
  options: CountrySelectOption[];
};

const CountrySelect = ({
  disabled,
  value,
  onChange,
  options,
}: CountrySelectProps) => {
  const handleSelect = React.useCallback(
    (country: Country) => {
      onChange(country);
    },
    [onChange]
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={"outline"}
          className={cn(
            "tw-flex tw-gap-1 tw-rounded-e-none tw-rounded-s-sm tw-px-3 tw-bg-transparent tw-border-border"
          )}
          disabled={disabled}
        >
          <FlagComponent country={value} countryName={value} />
          <ChevronsUpDown
            className={cn(
              "tw--mr-2 tw-h-4 tw-w-4 tw-opacity-50 tw-border-none",
              disabled ? "tw-hidden" : "tw-opacity-100"
            )}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="tw-w-[300px] tw-p-0">
        <Command>
          <CommandList>
            <ScrollArea className="tw-h-72">
              <CommandInput placeholder="Search country..." />
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                {options
                  .filter((x) => x.value)
                  .map((option) => (
                    <CommandItem
                      className="tw-gap-1"
                      key={option.value}
                      onSelect={() => handleSelect(option.value)}
                    >
                      <FlagComponent
                        country={option.value}
                        countryName={option.label}
                      />
                      <span className="tw-flex-1 tw-text-sm">
                        {option.label}
                      </span>
                      {option.value && (
                        <span className="tw-text-sm tw-text-foreground/50">
                          {`+${getCountryCallingCode(option.value)}`}
                        </span>
                      )}
                      <CheckIcon
                        className={cn(
                          "tw-ml-auto tw-h-4 tw-w-4",
                          option.value === value
                            ? "tw-opacity-100"
                            : "tw-opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

// Flag component
const FlagComponent = ({
  country,
  countryName,
}: {
  country: Country;
  countryName: string;
}) => {
  const Flag = flags[country];

  return (
    <span className="tw-flex tw-h-4 tw-w-6 tw-overflow-hidden tw-rounded-sm tw-bg-foreground/20">
      {Flag && <Flag title={countryName} />}
    </span>
  );
};
FlagComponent.displayName = "FlagComponent";

export default PhoneInput;
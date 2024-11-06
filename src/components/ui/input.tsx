import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "tw-flex tw-h-10 tw-w-full tw-rounded-md tw-border tw-border-input tw-px-3 tw-py-1.5 tw-text-sm tw-ring-offset-background file:tw-border-0 file:tw-bg-transparent file:tw-text-sm file:tw-font-medium placeholder:tw-text-[12px] placeholder:tw-font-normal placeholder:tw-text-[#B3B3B3] focus-visible:tw-outline-none focus-visible:tw-ring-2 focus-visible:tw-ring-blue-500 disabled:tw-cursor-not-allowed disabled:tw-opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }

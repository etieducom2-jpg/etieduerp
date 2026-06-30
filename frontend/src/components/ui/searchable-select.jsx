import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Searchable, scrollable Select (combobox).
 *
 * Props:
 *   options:     [{ value: string, label: string, keywords?: string }]
 *   value:       string | undefined
 *   onChange:    (value: string) => void
 *   placeholder: string
 *   searchPlaceholder?: string
 *   emptyText?:  string
 *   testid?:     string  (applied to the trigger button)
 *   className?:  string  (applied to the trigger button)
 *   disabled?:   boolean
 */
export function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  testid,
  className,
  disabled = false,
}) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          data-testid={testid}
          className={cn(
            "w-full justify-between font-normal",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate text-left">
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command
          filter={(itemValue, search) => {
            // itemValue here is the haystack we passed via CommandItem `value` (label + keywords).
            const haystack = itemValue.toLowerCase();
            const needle = search.toLowerCase();
            return haystack.includes(needle) ? 1 : 0;
          }}
        >
          <CommandInput
            placeholder={searchPlaceholder}
            data-testid={testid ? `${testid}-search` : undefined}
          />
          <CommandList className="max-h-60 overflow-y-auto">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => {
                const isSelected = opt.value === value;
                const haystack = `${opt.label} ${opt.keywords || ""}`.trim();
                return (
                  <CommandItem
                    key={opt.value}
                    value={haystack}
                    onSelect={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    data-testid={
                      testid ? `${testid}-option-${opt.value}` : undefined
                    }
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{opt.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default SearchableSelect;

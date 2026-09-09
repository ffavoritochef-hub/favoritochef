import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-xl border border-input bg-white px-4 py-3 text-[16px] leading-none text-foreground transition-colors shadow-sm file:inline-flex file:h-10 file:border-0 file:bg-transparent file:text-[16px] file:font-medium file:text-foreground placeholder:text-muted-foreground placeholder:text-[16px] placeholder:leading-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/15 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/20",
        className
      )}
      inputMode={type === "number" ? "decimal" : undefined}
      autoCorrect={type === "email" || type === "url" ? "off" : "on"}
      autoCapitalize={type === "email" || type === "password" || type === "url" ? "none" : "sentences"}
      spellCheck={type === "email" || type === "password" || type === "url" ? false : undefined}
      {...props}
    />
  )
}

export { Input }

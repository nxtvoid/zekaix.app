import { cn } from '@zekaix/utils/cn'

type EyebrowProps = {
  children: React.ReactNode
  className?: string
}

const Eyebrow = ({ children, className }: EyebrowProps) => {
  return (
    <div
      className={cn(
        'flex items-center gap-2 text-muted-foreground uppercase tracking-wide',
        'before:h-px before:w-6 before:flex-1 before:bg-border before:content-[""]',
        'after:h-px after:w-6 after:flex-1 after:bg-border after:content-[""]',
        'text-xs',
        className
      )}
    >
      {children}
    </div>
  )
}

export { Eyebrow }

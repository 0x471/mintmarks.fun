import React from 'react'
import { cn } from '../../lib/utils'

interface DropdownMenuProps {
  children: React.ReactNode
}

interface DropdownMenuContentProps {
  children: React.ReactNode
  align?: 'start' | 'center' | 'end'
  className?: string
}

interface DropdownMenuItemProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}

interface DropdownMenuTriggerProps {
  children: React.ReactNode
  asChild?: boolean
}

export function DropdownMenu({ children }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  
  let trigger: React.ReactNode = null
  let content: React.ReactNode = null
  
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child)) {
      if (child.type === DropdownMenuTrigger) {
        trigger = React.cloneElement(child as React.ReactElement<any>, {
          onClick: () => setIsOpen(!isOpen)
        })
      } else if (child.type === DropdownMenuContent) {
        content = isOpen ? React.cloneElement(child as React.ReactElement<any>, {
          onClose: () => setIsOpen(false)
        }) : null
      }
    }
  })
  
  return (
    <div className="relative inline-block">
      {trigger}
      {content}
    </div>
  )
}

export function DropdownMenuTrigger({ children, asChild, ...props }: DropdownMenuTriggerProps & React.HTMLAttributes<HTMLElement>) {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, props)
  }
  return <div {...props}>{children}</div>
}

export function DropdownMenuContent({ 
  children, 
  align = 'start', 
  className,
  onClose 
}: DropdownMenuContentProps & { onClose?: () => void }) {
  React.useEffect(() => {
    const handleClick = () => onClose?.()
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [onClose])

  const alignClass = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0'
  }[align]

  return (
    <div
      className={cn(
        'absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
        'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
        'top-full mt-1',
        alignClass,
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  )
}

export function DropdownMenuItem({ 
  children, 
  onClick, 
  className 
}: DropdownMenuItemProps) {
  return (
    <div
      className={cn(
        'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
        'transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

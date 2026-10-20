import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'
const styles = cva('inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition active:scale-[.98] disabled:opacity-40', { variants: { variant: { default: 'bg-accent text-ink', secondary: 'bg-white/10 text-white', ghost: 'bg-transparent text-current hover:bg-black/5', danger: 'bg-red-100 text-red-800' }, size: { default: '', icon: 'size-11 p-0' } }, defaultVariants: { variant: 'default', size: 'default' } })
export function Button({ className, variant, size, asChild, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof styles> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button'; return <Comp className={cn(styles({ variant, size }), className)} {...props} />
}

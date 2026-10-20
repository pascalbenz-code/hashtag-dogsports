import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <section className={cn('rounded-2xl border border-black/8 bg-white p-5 shadow-[0_8px_30px_rgba(16,29,24,.06)]', className)} {...props} /> }

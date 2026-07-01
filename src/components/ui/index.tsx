import React from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Loader2 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

// ---------------------------------------------------------------------------
// cn utility
// ---------------------------------------------------------------------------
export function cn(...args: Parameters<typeof clsx>): string {
  return twMerge(clsx(args))
}

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'gradient' | 'ghost' | 'danger' | 'outline' | 'surface'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
  leftIcon?: React.ReactNode
}

const buttonVariants: Record<NonNullable<ButtonProps['variant']>, string> = {
  gradient:
    'bg-gradient-to-r from-[#4f8df7] to-[#60a5fa] text-white shadow-lg shadow-[#4f8df7]/20 hover:opacity-90',
  ghost:
    'bg-white/5 hover:bg-white/10 border border-[#1e2d44] text-[#f0f4ff]',
  danger:
    'bg-red-500/10 hover:bg-red-500/15 text-red-400 border border-red-500/20',
  outline:
    'border border-[#1e2d44] text-[#8892a4] hover:bg-white/5',
  surface:
    'bg-[#1a2540] text-[#f0f4ff] hover:bg-[#1e2d44]',
}

const buttonSizes: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-11 px-5 text-base',
  lg: 'h-[3.25rem] px-7 text-lg',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'gradient',
      size = 'md',
      loading = false,
      fullWidth = false,
      leftIcon,
      children,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'rounded-2xl font-medium transition-all duration-150 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer select-none active:scale-[0.98]',
          buttonVariants[variant],
          buttonSizes[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            {children}
          </>
        )}
      </button>
    )
  }
)
Button.displayName = 'Button'

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, rightIcon, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm text-[#8892a4] mb-2 block font-medium"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8892a4] flex-shrink-0">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'bg-[#1a2540] border border-[#1e2d44] text-[#f0f4ff] placeholder-[#8892a4] rounded-2xl px-4 py-3 w-full text-base transition-all duration-150',
              'focus:outline-none focus:border-[#4f8df7] focus:ring-1 focus:ring-[#4f8df7]/30',
              error && 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20',
              leftIcon && 'pl-11',
              rightIcon && 'pr-11',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8892a4] flex-shrink-0">
              {rightIcon}
            </span>
          )}
        </div>
        {error && (
          <p className="text-red-400 text-xs mt-1">{error}</p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------
export interface CardProps {
  className?: string
  children: React.ReactNode
  glass?: boolean
  onClick?: () => void
  padding?: boolean
}

export function Card({
  className,
  children,
  glass = false,
  onClick,
  padding = true,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl',
        glass
          ? 'bg-white/5 backdrop-blur-xl border border-white/10'
          : 'bg-[#131e33] border border-[#1e2d44]',
        padding && 'p-4',
        onClick && 'cursor-pointer active:scale-[0.99] transition-transform duration-100',
        className
      )}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------
export interface BadgeProps {
  color: string
  label: string
  size?: 'sm' | 'md'
  className?: string
}

export function Badge({ color, label, size = 'md', className }: BadgeProps) {
  // Convert hex color to rgba background at 15% opacity
  const hexToRgba = (hex: string, alpha: number): string => {
    const clean = hex.replace('#', '')
    const r = parseInt(clean.substring(0, 2), 16)
    const g = parseInt(clean.substring(2, 4), 16)
    const b = parseInt(clean.substring(4, 6), 16)
    return `rgba(${r},${g},${b},${alpha})`
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs',
        className
      )}
      style={{
        backgroundColor: hexToRgba(color, 0.15),
        color,
      }}
    >
      {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
export interface SkeletonProps {
  className?: string
  height?: string | number
  width?: string | number
}

export function Skeleton({ className, height, width }: SkeletonProps) {
  return (
    <div
      className={cn('bg-[#1a2540] animate-pulse rounded-xl', className)}
      style={{
        height: typeof height === 'number' ? `${height}px` : height,
        width: typeof width === 'number' ? `${width}px` : width,
      }}
    />
  )
}

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------
export interface AvatarProps {
  name: string
  src?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const avatarSizes = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-xl',
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const [imgFailed, setImgFailed] = React.useState(false)

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  if (src && !imgFailed) {
    return (
      <img
        src={src}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className={cn('rounded-full object-cover flex-shrink-0', avatarSizes[size], className)}
      />
    )
  }

  return (
    <div
      className={cn(
        'rounded-full bg-gradient-to-br from-[#4f8df7] to-[#60a5fa] text-white flex items-center justify-center font-semibold flex-shrink-0',
        avatarSizes[size],
        className
      )}
    >
      {initials}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------
export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const spinnerSizes = {
  sm: 'w-4 h-4 border-2',
  md: 'w-5 h-5 border-2',
  lg: 'w-8 h-8 border-[3px]',
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <div
      className={cn(
        'border-white/20 border-t-white rounded-full animate-spin',
        spinnerSizes[size],
        className
      )}
    />
  )
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------
export interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center gap-4 py-12 px-6',
        className
      )}
    >
      <div className="w-16 h-16 rounded-full bg-[#1a2540] flex items-center justify-center text-2xl flex-shrink-0">
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-[#f0f4ff] font-semibold text-base">{title}</p>
        <p className="text-[#8892a4] text-sm leading-relaxed">{description}</p>
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ProgressBar
// ---------------------------------------------------------------------------
export interface ProgressBarProps {
  value: number
  className?: string
}

export function ProgressBar({ value, className }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div className={cn('h-2 bg-[#1a2540] rounded-full overflow-hidden', className)}>
      <div
        className="h-full bg-gradient-to-r from-[#4f8df7] to-[#60a5fa] rounded-full transition-all duration-500 ease-out"
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// BottomSheet
// ---------------------------------------------------------------------------
export interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  const [dragY, setDragY] = React.useState(0)
  const dragStartYRef = React.useRef<number | null>(null)
  const didDragRef = React.useRef(false)

  React.useEffect(() => {
    if (isOpen) setDragY(0)
  }, [isOpen])

  const resetDrag = () => {
    dragStartYRef.current = null
    window.setTimeout(() => {
      didDragRef.current = false
    }, 0)
  }

  const handleHandlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    dragStartYRef.current = event.clientY
    didDragRef.current = false
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleHandlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (dragStartYRef.current === null) return

    const nextY = Math.max(0, event.clientY - dragStartYRef.current)
    if (nextY > 4) didDragRef.current = true
    setDragY(Math.min(nextY, 160))
  }

  const handleHandlePointerEnd = () => {
    if (dragY > 46) {
      onClose()
    } else {
      setDragY(0)
    }
    resetDrag()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            key="overlay"
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Mobile: bottom sheet */}
          <motion.div
            key="panel-mobile"
            className="sm:hidden fixed bottom-0 left-0 right-0 bg-[#0d1526] rounded-t-3xl z-50 max-h-[90vh] overflow-y-auto"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            initial={{ y: '100%' }}
            animate={{ y: dragY }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <button
              type="button"
              onPointerDown={handleHandlePointerDown}
              onPointerMove={handleHandlePointerMove}
              onPointerUp={handleHandlePointerEnd}
              onPointerCancel={() => {
                setDragY(0)
                resetDrag()
              }}
              onClick={() => {
                if (!didDragRef.current) onClose()
              }}
              aria-label="Fechar painel"
              className="flex w-full cursor-grab justify-center px-6 pb-2 pt-4 active:cursor-grabbing"
              style={{ touchAction: 'none' }}
            >
              <span className="h-1.5 w-14 rounded-full bg-[#4b5870]" />
            </button>
            {title && (
              <div className="px-6 pt-2 pb-4 border-b border-[#1e2d44]">
                <h2 className="text-[#f0f4ff] font-semibold text-lg">{title}</h2>
              </div>
            )}
            <div className="px-4 py-4">{children}</div>
          </motion.div>

          {/* Desktop: centered modal */}
          <div className="hidden sm:flex fixed inset-0 z-50 items-center justify-center pointer-events-none">
            <motion.div
              key="panel-desktop"
              className="pointer-events-auto w-[min(96vw,680px)] bg-[#0d1526] rounded-3xl max-h-[85vh] overflow-y-auto border border-[#1e2d44] shadow-2xl"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            >
              {title && (
                <div className="px-6 pt-5 pb-4 border-b border-[#1e2d44]">
                  <h2 className="text-[#f0f4ff] font-semibold text-lg">{title}</h2>
                </div>
              )}
              <div className="px-4 py-4">{children}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

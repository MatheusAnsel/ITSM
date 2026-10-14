import { cn } from '@/lib/cn';

export const inputClass =
  'h-9 w-full rounded-lg border border-line bg-panel px-3 text-[13px] text-ink placeholder:text-ink-3 focus:border-line-strong disabled:opacity-50';

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-xs font-medium text-ink-2">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-bad">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-ink-3">{hint}</span>
      ) : null}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputClass, props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(inputClass, 'pr-8', props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputClass, 'h-auto min-h-[96px] py-2 leading-relaxed', props.className)} />;
}

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const VARIANT: Record<Variant, string> = {
  primary:
    'border-ask/70 bg-ask/10 text-ink shadow-[0_0_18px_-6px_rgba(255,77,109,0.6)] hover:bg-ask/20',
  secondary: 'border-line-strong bg-panel text-ink hover:bg-panel-2',
  danger: 'border-bad/50 bg-bad/10 text-bad hover:bg-bad/20',
  ghost: 'border-transparent text-ink-2 hover:bg-white/[0.06] hover:text-ink',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-8 px-3 text-[12.5px]' : 'h-9 px-4 text-[13px]',
        VARIANT[variant],
        className,
      )}
    />
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-[13px] text-bad">
      {message}
    </p>
  );
}

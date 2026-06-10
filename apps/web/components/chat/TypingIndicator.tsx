export function TypingIndicator({ names }: { names: string[] }) {
  if (names.length === 0) return null

  const label =
    names.length === 1
      ? `${names[0]} is typing`
      : names.length === 2
      ? `${names[0]} and ${names[1]} are typing`
      : `${names[0]} and ${names.length - 1} others are typing`

  return (
    <div className="flex items-center gap-2 px-6 py-1.5 text-xs text-muted-foreground select-none">
      <div className="flex items-end gap-0.5 h-3">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
      </div>
      <span>{label}…</span>
    </div>
  )
}

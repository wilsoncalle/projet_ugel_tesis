// ActionButton.jsx
import clsx from "clsx";

export default function ActionButton({
  onClick,
  label,
  Icon,
  variant = "neutral",
  title,
  className,
  disabled = false,
}) {
  const styles = {
    approve: "border-emerald-200 text-emerald-700 hover:bg-emerald-50 focus-visible:ring-emerald-500",
    reject:  "border-rose-200 text-rose-700 hover:bg-rose-50 focus-visible:ring-rose-500",
    cancel:  "border-amber-200 text-amber-700 hover:bg-amber-50 focus-visible:ring-amber-500",
    neutral: "border-slate-200 text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-500",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      title={title || label}
      aria-label={label}
      disabled={disabled}
      className={clsx(
        // base
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium",
        "transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2",
        "disabled:opacity-50 disabled:pointer-events-none",
        styles[variant],
        className
      )}
    >
      {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
      {/* Oculta el texto en pantallas chicas si quieres ícono-only */}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

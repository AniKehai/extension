import { motion } from "motion/react";

interface ToggleSwitchProps {
    checked: boolean;
    onChange: (next: boolean) => void;
    label: string;
    description?: string;
}

export function ToggleSwitch({
    checked,
    onChange,
    label,
    description,
}: ToggleSwitchProps) {
    return (
        <div className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
                <p className="text-[12.5px] font-medium text-ink">{label}</p>
                {description && (
                    <p className="mt-0.5 text-[11px] leading-snug text-muted">
                        {description}
                    </p>
                )}
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={label}
                onClick={() => onChange(!checked)}
                className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
                    checked
                        ? "border-cyan/60 bg-cyan/30"
                        : "border-white/10 bg-panel"
                }`}
            >
                <motion.span
                    layout
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className={`absolute top-0.5 rounded-full ${checked ? "left-5.5 bg-cyan" : "left-0.5 bg-muted"}`}
                    style={{ height: 18, width: 18 }}
                />
            </button>
        </div>
    );
}

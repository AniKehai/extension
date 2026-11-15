interface InkDividerProps {
	className?: string;
}

export function InkDivider({ className = "" }: InkDividerProps) {
	return (
		<svg
			viewBox="0 0 320 8"
			preserveAspectRatio="none"
			aria-hidden="true"
			className={`h-2 w-full text-white/10 ${className}`}
		>
			<path
				d="M2 4 C 40 1, 80 7, 130 3 S 220 1, 260 5 S 300 2, 318 4"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
			/>
		</svg>
	);
}

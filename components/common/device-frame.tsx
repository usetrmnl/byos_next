import type { ReactNode } from "react";
import {
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
} from "@/lib/recipes/constants";
import { cn } from "@/lib/utils";

interface DeviceFrameProps {
	children: ReactNode;
	/** Size tier — controls bezel thickness, corner radius, and shadow. */
	size?: "sm" | "md" | "lg";
	/** Portrait flips the screen aspect ratio. */
	portrait?: boolean;
	/**
	 * When set (e.g. `800 / 480`), overrides the default TRMNL aspect ratio.
	 * Use for previews that simulate a specific device resolution.
	 */
	screenAspectRatio?: string;
	className?: string;
	/** Render without the outer shadow (useful when nested in a card). */
	flat?: boolean;
}

const sizeStyles = {
	sm: {
		outer: "rounded-lg p-1",
		screen: "rounded-[4px]",
	},
	md: {
		outer: "rounded-[18px] p-2",
		screen: "rounded-[10px]",
	},
	lg: {
		outer: "rounded-[28px] p-3",
		screen: "rounded-[16px]",
	},
} as const;

/**
 * A dark rounded "TRMNL device" bezel around a rendered screen. Used by the
 * playlist preview, reel cards, filmstrip, and recipe previews so every place
 * that shows a device screen looks the same.
 */
export function DeviceFrame({
	children,
	size = "md",
	portrait = false,
	screenAspectRatio,
	className,
	flat = false,
}: DeviceFrameProps) {
	const styles = sizeStyles[size];
	const ratio =
		screenAspectRatio ??
		(portrait
			? `${DEFAULT_IMAGE_HEIGHT} / ${DEFAULT_IMAGE_WIDTH}`
			: `${DEFAULT_IMAGE_WIDTH} / ${DEFAULT_IMAGE_HEIGHT}`);

	return (
		<div
			className={cn(
				"relative bg-neutral-900 ring-1 ring-black/20 dark:ring-white/5",
				styles.outer,
				!flat && "shadow-[0_20px_40px_-20px_rgba(0,0,0,0.45)]",
				className,
			)}
		>
			<div
				className={cn(
					"relative overflow-hidden border border-black/40 bg-neutral-100",
					styles.screen,
				)}
				style={{ aspectRatio: ratio }}
			>
				{children}
			</div>
		</div>
	);
}

import type React from "react";

export function PanelHeader({
	label,
	right,
}: {
	label: string;
	right?: React.ReactNode;
}) {
	return (
		<div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-4 py-2">
			<h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
				{label}
			</h3>
			{right}
		</div>
	);
}

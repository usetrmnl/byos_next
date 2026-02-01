import type { ReactNode } from "react";

interface PageTemplateProps {
	title: string | ReactNode;
	subtitle?: string | ReactNode;
	left?: ReactNode;
	children?: ReactNode;
}

export function PageTemplate({
	title,
	subtitle,
	left,
	children,
}: PageTemplateProps) {
	return (
		<div className="space-y-6">
			<div className="flex items-start justify-between">
				<div className="space-y-2">
					{typeof title === "string" ? (
						<h1 className="text-3xl font-bold">{title}</h1>
					) : (
						title
					)}
					{subtitle &&
						(typeof subtitle === "string" ? (
							<p className="text-muted-foreground">{subtitle}</p>
						) : (
							subtitle
						))}
				</div>
				{left && <div>{left}</div>}
			</div>
			{children}
		</div>
	);
}

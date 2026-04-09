import { Suspense, type ReactNode } from "react";

export default function RecipePreviewLayout({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<Suspense fallback={<span>Rendering recipe...</span>}>{children}</Suspense>
	);
}

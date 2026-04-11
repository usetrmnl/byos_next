import { Suspense, type ReactNode } from "react";

export default function RecipePreviewLayout({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<>
			<style>{"nextjs-portal{display:none}"}</style>
			<Suspense fallback={<span>Rendering recipe...</span>}>
				{children}
			</Suspense>
		</>
	);
}

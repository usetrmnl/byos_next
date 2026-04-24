import { type ReactNode, Suspense } from "react";

export default function RecipePreviewLayout({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<>
			<style>{`
				nextjs-portal { display: none; }
				::-webkit-scrollbar { display: none !important; }
				* { scrollbar-width: none !important; -ms-overflow-style: none !important; }
			`}</style>
			<Suspense fallback={<span>Rendering recipe...</span>}>
				{children}
			</Suspense>
		</>
	);
}

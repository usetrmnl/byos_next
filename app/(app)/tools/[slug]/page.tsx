import { notFound } from "next/navigation";
import { cache, Suspense } from "react";
import tools from "@/app/(app)/tools/tools.json";
import { PageTemplate } from "@/components/ui/page-template";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const config = tools[slug as keyof typeof tools];

	if (!config) {
		return {
			title: "Tool Not Found",
		};
	}

	return {
		title: config.title,
		description: config.description,
	};
}

// Generate static params for all tools
export async function generateStaticParams() {
	return Object.keys(tools).map((slug) => ({ slug }));
}

// Fetch component for a recipe
const fetchComponent = cache(async (slug: string) => {
	try {
		// Use the componentPath from tools.json
		console.log(
			`Loading component: @/app/(app)/tools/tools-components/${slug}/${slug}.tsx`,
		);
		const { default: Component } = await import(
			`@/app/(app)/tools/tools-components/${slug}/${slug}.tsx`
		);
		return Component;
	} catch (error) {
		console.error(`Error loading component for ${slug}:`, error);
		return null;
	}
});

// Dynamic tool component loader
async function ToolComponent({ slug }: { slug: string }) {
	const Component = await fetchComponent(slug);

	if (!Component) {
		return (
			<div className="w-full h-full flex items-center justify-center">
				Component not found
			</div>
		);
	}

	return <Component />;
}

export default async function ToolPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const config = tools[slug as keyof typeof tools];

	console.log(`config: ${config}`);

	if (!config) {
		notFound();
	}

	return (
		<PageTemplate title={config.title} subtitle={config.description}>
			<Suspense fallback={<div>Loading tool...</div>}>
				<ToolComponent slug={slug} />
			</Suspense>
		</PageTemplate>
	);
}

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";
import tools from "@/app/(app)/tools/tools.json";
import { PageTemplate } from "@/components/common/page-template";
import { Badge } from "@/components/ui/badge";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const config = tools[slug as keyof typeof tools];

	if (!config) return { title: "Tool not found" };

	return { title: config.title, description: config.description };
}

export async function generateStaticParams() {
	return Object.keys(tools).map((slug) => ({ slug }));
}

const fetchComponent = cache(async (slug: string) => {
	try {
		const { default: Component } = await import(
			`@/app/(app)/tools/tools-components/${slug}/${slug}.tsx`
		);
		return Component;
	} catch (error) {
		console.error(`Error loading component for ${slug}:`, error);
		return null;
	}
});

async function ToolComponent({ slug }: { slug: string }) {
	const Component = await fetchComponent(slug);

	if (!Component) {
		return (
			<div className="rounded-xl border border-dashed bg-muted/20 px-4 py-12 text-center text-sm text-muted-foreground">
				Component not found.
			</div>
		);
	}

	return <Component />;
}

function MetaChips({
	type,
	version,
	category,
	updatedAt,
}: {
	type?: string | null;
	version?: string | null;
	category?: string | null;
	updatedAt?: string | null;
}) {
	return (
		<div className="flex flex-wrap items-center gap-1.5 text-xs">
			{type && (
				<Badge
					variant="outline"
					className="uppercase tracking-wider text-[10px]"
				>
					{type}
				</Badge>
			)}
			{version && (
				<Badge variant="secondary" className="tabular-nums">
					v{version}
				</Badge>
			)}
			{category && (
				<span className="rounded-md border bg-muted/40 px-2 py-0.5 capitalize text-muted-foreground">
					{category.replace(/-/g, " ")}
				</span>
			)}
			{updatedAt && (
				<span className="text-muted-foreground tabular-nums">
					Updated {new Date(updatedAt).toLocaleDateString()}
				</span>
			)}
		</div>
	);
}

export default async function ToolPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const config = tools[slug as keyof typeof tools];

	if (!config) notFound();

	return (
		<PageTemplate
			title={
				<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
					<h1 className="text-2xl font-bold tracking-tight">{config.title}</h1>
					<MetaChips
						type="tool"
						version={config.version}
						category={config.category}
						updatedAt={config.updatedAt}
					/>
				</div>
			}
			subtitle={
				<p className="max-w-prose text-sm text-muted-foreground">
					{config.description}
				</p>
			}
			left={
				config.author?.github ? (
					<Link
						href={`https://github.com/${config.author.github}`}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
					>
						{config.author.name}
						<ExternalLink className="h-3 w-3" />
					</Link>
				) : null
			}
		>
			<Suspense
				fallback={
					<div className="rounded-xl border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
						Loading tool…
					</div>
				}
			>
				<ToolComponent slug={slug} />
			</Suspense>
		</PageTemplate>
	);
}

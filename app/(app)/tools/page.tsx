import { ArrowUpRight, Wrench } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import tools from "@/app/(app)/tools/tools.json";
import { PageTemplate } from "@/components/common/page-template";
import { Badge } from "@/components/ui/badge";

type ToolConfig = {
	title: string;
	published: boolean;
	description: string;
	tags: string[];
	author: {
		name: string;
		github: string;
	};
	version: string;
	category: string;
	createdAt: string;
	updatedAt: string;
};

const getPublishedTools = () => {
	const toolEntries = Object.entries(tools as Record<string, ToolConfig>);
	return process.env.NODE_ENV === "production"
		? toolEntries.filter(([, config]) => config.published)
		: toolEntries;
};

const ToolCard = ({ slug, config }: { slug: string; config: ToolConfig }) => {
	return (
		<Link
			key={slug}
			href={`/tools/${slug}`}
			className="group flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
		>
			<div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2.5">
				<div className="flex items-center gap-2">
					<div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
						<Wrench className="h-3.5 w-3.5" />
					</div>
					<Badge variant="secondary" className="tabular-nums">
						v{config.version}
					</Badge>
				</div>
				<ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
			</div>

			<div className="flex flex-1 flex-col gap-2 p-4">
				<h3 className="text-base font-semibold tracking-tight transition-colors group-hover:text-primary">
					{config.title}
				</h3>
				<p className="line-clamp-3 text-sm text-muted-foreground">
					{config.description}
				</p>

				{config.tags?.length > 0 && (
					<div className="flex flex-wrap gap-1.5 pt-1">
						{config.tags.slice(0, 4).map((tag) => (
							<span
								key={tag}
								className="rounded-md border bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
							>
								{tag}
							</span>
						))}
						{config.tags.length > 4 && (
							<span className="rounded-md border bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
								+{config.tags.length - 4}
							</span>
						)}
					</div>
				)}

				<div className="mt-auto flex items-center justify-between pt-2 text-[11px] text-muted-foreground">
					<span className="truncate">by {config.author?.name}</span>
					<span className="tabular-nums">
						{new Date(config.updatedAt).toLocaleDateString()}
					</span>
				</div>
			</div>
		</Link>
	);
};

const CategorySection = ({
	category,
	tools,
}: {
	category: string;
	tools: Array<[string, ToolConfig]>;
}) => {
	return (
		<section key={category} className="space-y-4">
			<div className="flex items-center gap-3">
				<h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
					{category.replace(/-/g, " ")}
				</h3>
				<span className="rounded-full border px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
					{tools.length}
				</span>
				<div className="h-px flex-1 bg-border" />
			</div>
			<div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
				{tools.map(([slug, config]) => (
					<ToolCard key={slug} slug={slug} config={config} />
				))}
			</div>
		</section>
	);
};

const ToolsGrid = () => {
	const publishedTools = getPublishedTools();

	const toolsByCategory = publishedTools.reduce(
		(acc, [slug, config]) => {
			const category = config.category || "uncategorized";
			if (!acc[category]) acc[category] = [];
			acc[category].push([slug, config]);
			return acc;
		},
		{} as Record<string, Array<[string, ToolConfig]>>,
	);

	const sortedCategories = Object.keys(toolsByCategory).sort();

	return (
		<div className="space-y-10">
			{sortedCategories.map((category) => (
				<CategorySection
					key={category}
					category={category}
					tools={toolsByCategory[category]}
				/>
			))}
		</div>
	);
};

export default function ToolsIndex() {
	return (
		<PageTemplate
			title="Tools"
			subtitle="Helpful tools for your workflow and creative projects."
		>
			<Suspense
				fallback={
					<div className="text-sm text-muted-foreground">Loading tools…</div>
				}
			>
				<ToolsGrid />
			</Suspense>
		</PageTemplate>
	);
}

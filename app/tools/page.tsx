import Link from "next/link";
import { Suspense } from "react";
import tools from "@/app/tools/tools.json";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-static";

// Tool configuration type
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

// Get published tools
const getPublishedTools = () => {
	const toolEntries = Object.entries(tools as Record<string, ToolConfig>);

	// Filter out unpublished tools in production
	return process.env.NODE_ENV === "production"
		? toolEntries.filter(([, config]) => config.published)
		: toolEntries;
};

// Component for a single card
const ToolCard = ({ slug, config }: { slug: string; config: ToolConfig }) => {
	return (
		<Link
			key={slug}
			href={`/tools/${slug}`}
			className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow group flex flex-col h-full"
		>
			<div className="p-4 flex flex-col flex-grow">
				<h4 className="scroll-m-20 text-xl font-semibold tracking-tight group-hover:text-blue-600 transition-colors">
					{config.title}
				</h4>
				<p className="text-gray-600 text-sm mt-2 mb-4 flex-grow">
					{config.description}
				</p>

				<div className="flex flex-wrap gap-2 mt-auto">
					{config.tags.slice(0, 3).map((tag: string) => (
						<Badge key={tag} variant="outline">
							{tag}
						</Badge>
					))}
					{config.tags.length > 3 && (
						<Badge variant="outline">+{config.tags.length - 3} more</Badge>
					)}
				</div>
				<div className="mt-4 text-xs text-gray-500 flex justify-between items-center">
					<span>v{config.version}</span>
					<span>{new Date(config.updatedAt).toLocaleDateString()}</span>
				</div>
			</div>
		</Link>
	);
};

// Component for a category section
const CategorySection = ({
	category,
	tools,
}: {
	category: string;
	tools: Array<[string, ToolConfig]>;
}) => {
	return (
		<div key={category} className="mb-8">
			<h3 className="scroll-m-20 text-2xl font-semibold tracking-tight mb-4">
				{category.replace(/-/g, " ")}
			</h3>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{tools.map(([slug, config]) => (
					<ToolCard key={slug} slug={slug} config={config} />
				))}
			</div>
		</div>
	);
};

// Main component that organizes tools by category
const ToolsGrid = () => {
	const publishedTools = getPublishedTools();

	// Group tools by category
	const toolsByCategory = publishedTools.reduce(
		(acc, [slug, config]) => {
			const category = config.category || "uncategorized";
			if (!acc[category]) {
				acc[category] = [];
			}
			acc[category].push([slug, config]);
			return acc;
		},
		{} as Record<string, Array<[string, ToolConfig]>>,
	);

	// Sort categories alphabetically
	const sortedCategories = Object.keys(toolsByCategory).sort();

	return (
		<div className="flex flex-col">
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
		<div className="space-y-6">
			<div className="space-y-2">
				<h1 className="text-3xl font-bold">Tools</h1>
				<p className="text-muted-foreground">
					Explore and use helpful tools for your workflow and creative projects.
				</p>
			</div>
			<Suspense fallback={<div>Loading tools...</div>}>
				<ToolsGrid />
			</Suspense>
		</div>
	);
}

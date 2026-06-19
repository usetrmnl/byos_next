interface Author {
	name: string;
	github: string;
}

interface RecipeConfig {
	title: string;
	published: boolean;
	createdAt: string;
	updatedAt: string;
	description: string;
	componentPath: string;
	hasDataFetch: boolean;
	props: Record<string, unknown>;
	tags: string[];
	author: Author;
	renderSettings: Record<string, unknown>;
	version: string;
	category: string;
}

interface ToolConfig {
	title: string;
	published: boolean;
	createdAt: string;
	updatedAt: string;
	description: string;
	tags: string[];
	author: Author;
	version: string;
	category: string;
}

export type ComponentConfig = RecipeConfig | ToolConfig;

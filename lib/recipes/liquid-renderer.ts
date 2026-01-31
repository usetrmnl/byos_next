import { Liquid } from "liquidjs";
import yaml from "js-yaml";
import { withUserScope } from "@/lib/database/scoped-db";
import { checkDbConnection } from "@/lib/database/utils";
import { logger, type RecipeParamDefinitions } from "./recipe-renderer";

const TRMNL_CSS_URL = "https://trmnl.com/css/latest/plugins.css";
const TRMNL_JS_URL = "https://trmnl.com/js/latest/plugins.js";

export type CustomField = {
	keyname?: string;
	name?: string;
	field_type?: string;
	default?: unknown;
	description?: string;
	[key: string]: unknown;
};

export type SettingsYml = {
	polling_url?: string;
	custom_fields?: CustomField[];
	[key: string]: unknown;
};

type LiquidRenderResult = {
	html: string;
	settings: SettingsYml;
};

/**
 * Fetch recipe files from the database for a given recipe slug.
 * Returns a map of filename -> content.
 */
async function fetchRecipeFiles(
	slug: string,
): Promise<Map<string, string> | null> {
	const { ready } = await checkDbConnection();
	if (!ready) {
		logger.warn("Database not ready, cannot fetch liquid recipe files");
		return null;
	}

	const files = await withUserScope(async (scopedDb) => {
		return scopedDb
			.selectFrom("recipe_files")
			.innerJoin("recipes", "recipes.id", "recipe_files.recipe_id")
			.select(["recipe_files.filename", "recipe_files.content"])
			.where("recipes.slug", "=", slug)
			.where("recipes.type", "=", "liquid")
			.execute();
	});

	if (!files || files.length === 0) {
		return null;
	}

	const fileMap = new Map<string, string>();
	for (const file of files) {
		fileMap.set(file.filename, file.content);
	}
	return fileMap;
}

/**
 * Parse settings.yml content to extract custom_fields defaults and polling_url.
 */
function parseSettings(settingsContent: string): SettingsYml {
	try {
		const parsed = yaml.load(settingsContent);
		if (parsed && typeof parsed === "object") {
			return parsed as SettingsYml;
		}
	} catch (error) {
		logger.error("Error parsing settings.yml:", error);
	}
	return {};
}

/**
 * Extract default values from custom_fields definition.
 * custom_fields is an array of { keyname, default, ... } objects.
 */
function extractCustomFieldDefaults(
	settings: SettingsYml,
): Record<string, unknown> {
	const defaults: Record<string, unknown> = {};
	if (Array.isArray(settings.custom_fields)) {
		for (const field of settings.custom_fields) {
			if (field.keyname && field.default !== undefined) {
				defaults[field.keyname] = field.default;
			}
		}
	}
	return defaults;
}

/**
 * Fetch data from polling URL(s). Multiple URLs can be newline-separated.
 * Each URL's data is assigned to IDX_0, IDX_1, etc.
 */
async function fetchPollingData(
	pollingUrl: string,
): Promise<Record<string, unknown>> {
	const urls = pollingUrl
		.split(/[\r\n]+/)
		.map((u) => u.trim())
		.filter(Boolean);

	const data: Record<string, unknown> = {};

	const results = await Promise.allSettled(
		urls.map(async (url, index) => {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), 10000);
			try {
				const response = await fetch(url, { signal: controller.signal });
				if (!response.ok) {
					logger.warn(`Polling URL ${url} returned ${response.status}`);
					return { index, result: null };
				}
				const json = await response.json();
				return { index, result: json };
			} catch (error) {
				logger.error(`Error fetching polling URL ${url}:`, error);
				return { index, result: null };
			} finally {
				clearTimeout(timeout);
			}
		}),
	);

	for (const settled of results) {
		if (settled.status === "fulfilled" && settled.value.result !== null) {
			data[`IDX_${settled.value.index}`] = settled.value.result;
		}
	}

	return data;
}

/**
 * Strip TRMNL-specific {% template name %}...{% endtemplate %} wrappers,
 * keeping their inner content so liquidjs doesn't choke on unknown tags.
 */
function stripTemplateBlocks(content: string): string {
	return content
		.replace(/\{%[-\s]*template\s+\w+\s*[-]?%\}/g, "")
		.replace(/\{%[-\s]*endtemplate\s*[-]?%\}/g, "");
}

/**
 * Wrap inline <script>...</script> content in {% raw %}...{% endraw %}
 * so liquidjs doesn't try to parse JS syntax (e.g. spread `...` as range `..`).
 * Only targets inline scripts (skips <script src="..."></script>).
 */
function protectScriptBlocks(content: string): string {
	return content.replace(
		/(<script(?![^>]*\bsrc\s*=)[^>]*>)([\s\S]*?)(<\/script>)/gi,
		(_, open, body, close) => `${open}{% raw %}${body}{% endraw %}${close}`,
	);
}

/**
 * Strip parentheses from Liquid conditionals ({% if %}, {% elsif %}, {% unless %}).
 * TRMNL's Ruby Liquid supports grouping with parens but liquidjs doesn't —
 * it misreads `(name` as the start of a range expression like `(1..5)`.
 * Liquid evaluates and/or left-to-right, so parens can be safely removed.
 */
function stripConditionalParens(content: string): string {
	return content.replace(
		/\{%[-\s]*(if|elsif|unless)\s+([\s\S]*?)[-]?%\}/g,
		(match) => match.replace(/[()]/g, ""),
	);
}

/**
 * Extract named template blocks defined with TRMNL's custom syntax:
 *   {% template name %}...{% endtemplate %}
 * Returns a map of template name -> content (with tags stripped).
 */
function extractTemplateBlocks(content: string): Record<string, string> {
	const blocks: Record<string, string> = {};
	const regex =
		/\{%[-\s]*template\s+(\w+)\s*[-]?%\}([\s\S]*?)\{%[-\s]*endtemplate\s*[-]?%\}/g;
	let match: RegExpExecArray | null;
	while ((match = regex.exec(content)) !== null) {
		blocks[match[1]] = match[2].trim();
	}
	return blocks;
}

/**
 * Find the main liquid template file from the recipe files map.
 * Looks for full.liquid at common paths.
 */
function findTemplateFile(
	files: Map<string, string>,
	name: string,
): string | null {
	// Try common paths in order of specificity
	const candidates = [
		`src/${name}`,
		name,
		`views/${name}`,
		`templates/${name}`,
	];
	for (const candidate of candidates) {
		if (files.has(candidate)) {
			return files.get(candidate)!;
		}
	}
	// Fallback: find any file ending with the name
	for (const [filename, content] of files) {
		if (filename.endsWith(`/${name}`) || filename === name) {
			return content;
		}
	}
	return null;
}

/**
 * Fetch and return the parsed settings.yml for a liquid recipe.
 */
export async function fetchLiquidRecipeSettings(
	slug: string,
): Promise<SettingsYml | null> {
	const files = await fetchRecipeFiles(slug);
	if (!files) return null;

	const settingsContent = findTemplateFile(files, "settings.yml");
	return settingsContent ? parseSettings(settingsContent) : null;
}

/**
 * Render a liquid recipe by slug.
 *
 * 1. Fetches recipe files from DB
 * 2. Parses settings.yml for custom_fields defaults and polling_url
 * 3. Fetches data from polling URL(s)
 * 4. Renders full.liquid with liquidjs, registering shared.liquid as a partial
 * 5. Returns rendered HTML
 *
 * @param customFieldOverrides - optional overrides merged over custom_field defaults
 */
export async function renderLiquidRecipe(
	slug: string,
	customFieldOverrides?: Record<string, unknown>,
): Promise<LiquidRenderResult | null> {
	const files = await fetchRecipeFiles(slug);
	if (!files) {
		logger.warn(`No liquid recipe files found for slug: ${slug}`);
		return null;
	}

	// Parse settings
	const settingsContent = findTemplateFile(files, "settings.yml");
	const settings = settingsContent ? parseSettings(settingsContent) : {};

	// Build custom fields values from defaults, then apply overrides
	const customFieldValues = {
		...extractCustomFieldDefaults(settings),
		...customFieldOverrides,
	};

	// Fetch polling data, substituting {{placeholder}} values in the URL
	// Handles both {{key}} and {{ key }} (with optional spaces)
	let pollingData: Record<string, unknown> = {};
	if (settings.polling_url) {
		let resolvedUrl = settings.polling_url;
		for (const [key, value] of Object.entries(customFieldValues)) {
			resolvedUrl = resolvedUrl.replace(
				new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"),
				String(value),
			);
		}
		pollingData = await fetchPollingData(resolvedUrl);
	}

	// Find the main template
	let fullTemplate = findTemplateFile(files, "full.liquid");
	if (!fullTemplate) {
		logger.error(`No full.liquid template found for recipe: ${slug}`);
		return null;
	}

	// Build templates map for partials (all .liquid files except full.liquid)
	const templates: Record<string, string> = {};
	for (const [filename, content] of files) {
		if (filename.endsWith(".liquid") && !filename.endsWith("full.liquid")) {
			// Register under multiple names for flexible {% render %} / {% include %} usage
			const baseName = filename
				.replace(/^src\//, "")
				.replace(/^views\//, "")
				.replace(/^templates\//, "")
				.replace(/\.liquid$/, "");
			templates[baseName] = stripTemplateBlocks(content);
			templates[filename] = stripTemplateBlocks(content);

			// Register {% template name %}...{% endtemplate %} blocks as named partials
			const blocks = extractTemplateBlocks(content);
			for (const [blockName, blockContent] of Object.entries(blocks)) {
				templates[blockName] = blockContent;
			}
		}
	}
	const sharedTemplate = findTemplateFile(files, "shared.liquid");
	if (sharedTemplate) {
		const stripped = stripTemplateBlocks(sharedTemplate);
		templates["shared"] = stripped;
		fullTemplate = stripped + "\n" + fullTemplate;
	}

	// Set up liquidjs engine with in-memory templates for partials
	const engine = new Liquid({
		strictFilters: false,
		strictVariables: false,
		templates,
	});

	// Register custom filters used by TRMNL templates
	engine.registerFilter("l_date", (date: string, format?: string) => {
		try {
			const d = date ? new Date(date) : new Date();
			if (isNaN(d.getTime())) return date;
			if (format === "%B %d, %Y") {
				return d.toLocaleDateString("en-US", {
					year: "numeric",
					month: "long",
					day: "numeric",
				});
			}
			if (format === "%m/%d/%Y") {
				return d.toLocaleDateString("en-US", {
					year: "numeric",
					month: "2-digit",
					day: "2-digit",
				});
			}
			return d.toLocaleDateString();
		} catch {
			return date;
		}
	});

	// Build template context
	const context: Record<string, unknown> = {
		trmnl: {
			plugin_settings: {
				custom_fields_values: customFieldValues,
			},
		},
		...pollingData,
	};

	try {
		const prepared = stripConditionalParens(protectScriptBlocks(fullTemplate));
		const body = await engine.parseAndRender(prepared, context);
		const html = `
<!DOCTYPE html>
<html>
  <head>
    <link rel="stylesheet" href="https://trmnl.com/css/latest/plugins.css">
    <script src="https://trmnl.com/js/latest/plugins.js"></script>
  </head>
  <body class="environment trmnl">
    <div class="screen">
		<div class="view view--full">
		${body}
		</div>
	</div>
    </div>
  </body>
</html>`;
		return { html, settings };
	} catch (error) {
		logger.error(`Error rendering liquid template for ${slug}: `, error);
		return null;
	}
}

/**
 * Convert TRMNL custom_fields to RecipeParamDefinitions.
 */
export function customFieldsToParamDefinitions(
	fields: CustomField[],
): RecipeParamDefinitions {
	const definitions: RecipeParamDefinitions = {};
	for (const field of fields) {
		if (!field.keyname) continue;
		definitions[field.keyname] = {
			label: field.name ?? field.keyname,
			type: field.field_type === "number" ? "number" : "string",
			default: field.default,
			description: field.description,
		};
	}
	return definitions;
}

/**
 * Check if a recipe slug exists in the DB as a liquid recipe.
 */
export async function isLiquidRecipe(slug: string): Promise<boolean> {
	const { ready } = await checkDbConnection();
	if (!ready) return false;

	const recipe = await withUserScope(async (scopedDb) => {
		return scopedDb
			.selectFrom("recipes")
			.select("id")
			.where("slug", "=", slug)
			.where("type", "=", "liquid")
			.executeTakeFirst();
	});

	return !!recipe;
}

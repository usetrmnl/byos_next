import { z } from "zod";

/**
 * Form-friendly description of a single recipe parameter, derived from a
 * Zod field schema. This is the shape the existing `<ScreenParamsForm>`
 * consumes — a stable interface that can also be produced from non-Zod
 * sources (e.g. liquid plugin custom_fields) without coupling the form to
 * Zod's internals.
 */
export type RecipeParamType = "string" | "number" | "boolean";

export type RecipeParamDefinition = {
	label: string;
	type: RecipeParamType;
	description?: string;
	default?: unknown;
	placeholder?: string;
};

export type RecipeParamDefinitions = Record<string, RecipeParamDefinition>;

type FieldMeta = {
	title?: string;
	placeholder?: string;
};

type ZodInternals = {
	def: { type: string; innerType?: z.ZodTypeAny };
};

const WRAPPER_TYPES = new Set([
	"optional",
	"default",
	"nullable",
	"readonly",
	"catch",
	"prefault",
	"nonoptional",
	"pipe",
]);

/**
 * Walk to the underlying type past optional/default/readonly wrappers so
 * we can detect whether the field is fundamentally a string, number, or
 * boolean.
 */
function unwrapToBaseType(schema: z.ZodTypeAny): z.ZodTypeAny {
	let current: z.ZodTypeAny = schema;
	while (true) {
		const internals = (current as unknown as { _zod?: ZodInternals })._zod;
		if (!internals?.def) return current;
		const t = internals.def.type;
		if (WRAPPER_TYPES.has(t) && internals.def.innerType) {
			current = internals.def.innerType;
			continue;
		}
		return current;
	}
}

function detectFieldType(schema: z.ZodTypeAny): RecipeParamType | null {
	const base = unwrapToBaseType(schema);
	const internals = (base as unknown as { _zod?: ZodInternals })._zod;
	const t = internals?.def.type;
	if (t === "string") return "string";
	if (t === "number") return "number";
	if (t === "boolean") return "boolean";
	return null;
}

/**
 * Read a description set via `.describe()` anywhere in the schema chain.
 */
function readDescription(schema: z.ZodTypeAny): string | undefined {
	const desc = schema.description;
	if (typeof desc === "string" && desc.length > 0) return desc;
	const base = unwrapToBaseType(schema);
	const baseDesc = base.description;
	return typeof baseDesc === "string" && baseDesc.length > 0
		? baseDesc
		: undefined;
}

/**
 * Read `.meta({ title, placeholder })` set anywhere in the schema chain.
 * Zod 4 stores meta on the global registry — `.meta(obj)` is the supported
 * way to attach UI hints.
 */
function readMeta(schema: z.ZodTypeAny): FieldMeta {
	const meta =
		typeof schema.meta === "function"
			? (schema.meta() as FieldMeta | undefined)
			: undefined;
	if (meta && (meta.title || meta.placeholder)) return meta;
	const base = unwrapToBaseType(schema);
	const baseMeta =
		typeof base.meta === "function"
			? (base.meta() as FieldMeta | undefined)
			: undefined;
	return baseMeta ?? {};
}

/**
 * Read `.default(value)` from anywhere in the schema chain by parsing
 * `undefined` — Zod will resolve any nested default for us.
 */
function readDefault(schema: z.ZodTypeAny): unknown {
	const result = schema.safeParse(undefined);
	return result.success ? result.data : undefined;
}

function humanizeKey(key: string): string {
	return key
		.replace(/[_-]+/g, " ")
		.replace(/([a-z])([A-Z])/g, "$1 $2")
		.replace(/^./, (c) => c.toUpperCase());
}

/**
 * Convert a `z.object({ … })` schema into the form's `RecipeParamDefinitions`
 * shape. Skips fields whose base type is not string/number/boolean — those
 * are not user-editable today.
 */
export function zodObjectToParamDefinitions(
	schema: z.ZodObject,
): RecipeParamDefinitions {
	const shape = schema.shape as Record<string, z.ZodTypeAny>;
	const definitions: RecipeParamDefinitions = {};

	for (const [key, fieldSchema] of Object.entries(shape)) {
		const type = detectFieldType(fieldSchema);
		if (!type) continue;

		const meta = readMeta(fieldSchema);
		const description = readDescription(fieldSchema);
		const defaultValue = readDefault(fieldSchema);

		definitions[key] = {
			label: meta.title ?? humanizeKey(key),
			type,
			...(description !== undefined ? { description } : {}),
			...(defaultValue !== undefined ? { default: defaultValue } : {}),
			...(meta.placeholder !== undefined
				? { placeholder: meta.placeholder }
				: {}),
		};
	}

	return definitions;
}

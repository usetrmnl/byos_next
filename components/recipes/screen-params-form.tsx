"use client";

import { AlertCircle, Check, Save } from "lucide-react";
import type { ChangeEvent } from "react";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
	RecipeParamDefinition,
	RecipeParamDefinitions,
} from "@/lib/recipes/recipe-renderer";

type Props = {
	slug: string;
	paramsSchema: RecipeParamDefinitions;
	initialValues: Record<string, unknown>;
	updateAction: (
		slug: string,
		params: Record<string, unknown>,
		definitions?: RecipeParamDefinitions,
	) => Promise<{ success: boolean; error?: string }>;
};

type FormStatus = "idle" | "success" | "error";

const buildInitialState = (
	schema: RecipeParamDefinitions,
	initialValues: Record<string, unknown>,
) => {
	const state: Record<string, unknown> = {};
	for (const [key, definition] of Object.entries(schema)) {
		const value = initialValues[key];
		if (value !== undefined && value !== null && value !== "") {
			state[key] = value;
			continue;
		}
		if (definition.default !== undefined) {
			state[key] = definition.default;
		} else {
			state[key] = "";
		}
	}
	return state;
};

const renderField = (
	key: string,
	definition: RecipeParamDefinition,
	value: unknown,
	onChange: (key: string, value: unknown) => void,
) => {
	const commonProps = {
		id: key,
		name: key,
		value: typeof value === "string" || typeof value === "number" ? value : "",
		onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
			const nextValue =
				definition.type === "number"
					? Number.isNaN(Number(event.target.value))
						? ""
						: Number(event.target.value)
					: event.target.value;
			onChange(key, nextValue);
		},
		placeholder: definition.placeholder,
	};

	switch (definition.type) {
		case "number":
			return <Input type="number" {...commonProps} />;
		default:
			return <Input type="text" {...commonProps} />;
	}
};

export function ScreenParamsForm({
	slug,
	paramsSchema,
	initialValues,
	updateAction,
}: Props) {
	const [formStatus, setFormStatus] = useState<FormStatus>("idle");
	const [statusMessage, setStatusMessage] = useState<string>("");
	const [isPending, startTransition] = useTransition();
	const [values, setValues] = useState<Record<string, unknown>>(() =>
		buildInitialState(paramsSchema, initialValues),
	);
	const [initial] = useState(() =>
		buildInitialState(paramsSchema, initialValues),
	);

	const hasParams = useMemo(
		() => Object.keys(paramsSchema || {}).length > 0,
		[paramsSchema],
	);

	const isDirty = useMemo(
		() => JSON.stringify(values) !== JSON.stringify(initial),
		[values, initial],
	);

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setFormStatus("idle");
		setStatusMessage("");

		startTransition(async () => {
			const result = await updateAction(slug, values, paramsSchema);
			if (!result.success) {
				setFormStatus("error");
				setStatusMessage(result.error ?? "Unable to save configuration");
				return;
			}
			setFormStatus("success");
			setStatusMessage("Saved");
		});
	};

	const handleReset = () => {
		setValues(initial);
		setFormStatus("idle");
		setStatusMessage("");
	};

	if (!hasParams) return null;

	const entries = Object.entries(paramsSchema);

	return (
		<form
			onSubmit={handleSubmit}
			className="overflow-hidden rounded-xl border bg-card"
		>
			<div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-4 py-1.5">
				<div className="flex items-center gap-2">
					<h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
						Parameters
					</h3>
					<span className="rounded-full border px-1.5 text-[10px] font-medium tabular-nums text-muted-foreground">
						{entries.length}
					</span>
				</div>
				<div className="flex items-center gap-2 text-xs">
					{formStatus === "success" && (
						<span className="inline-flex items-center gap-1 text-primary">
							<Check className="h-3 w-3" />
							{statusMessage || "Saved"}
						</span>
					)}
					{formStatus === "error" && (
						<span className="inline-flex items-center gap-1 text-destructive">
							<AlertCircle className="h-3 w-3" />
							{statusMessage || "Error"}
						</span>
					)}
					{formStatus === "idle" && isDirty && (
						<span className="text-muted-foreground">Unsaved</span>
					)}
					{isDirty && !isPending && (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="h-7 px-2"
							onClick={handleReset}
						>
							Reset
						</Button>
					)}
					<Button
						type="submit"
						size="sm"
						className="h-7 px-2.5"
						disabled={isPending || !isDirty}
					>
						<Save className="mr-1 h-3 w-3" />
						{isPending ? "Saving…" : "Save"}
					</Button>
				</div>
			</div>
			<div className="grid gap-4 p-4 sm:grid-cols-2">
				{entries.map(([key, definition]) => (
					<div key={key} className="flex flex-col gap-1.5">
						<div className="flex items-baseline justify-between gap-2">
							<Label htmlFor={key} className="text-xs font-semibold">
								{definition.label}
							</Label>
							{definition.description && (
								<span className="truncate text-[11px] text-muted-foreground">
									{definition.description}
								</span>
							)}
						</div>
						{renderField(key, definition, values[key], (field, val) =>
							setValues((prev) => ({ ...prev, [field]: val })),
						)}
					</div>
				))}
			</div>
		</form>
	);
}

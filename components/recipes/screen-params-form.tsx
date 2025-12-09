"use client";

import { AlertCircle, Check } from "lucide-react";
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
		className: "max-w-lg",
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

	const hasParams = useMemo(
		() => Object.keys(paramsSchema || {}).length > 0,
		[paramsSchema],
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
			setStatusMessage("Configuration saved");
		});
	};

	if (!hasParams) return null;

	return (
		<div className="mt-8 space-y-4">
			<div className="flex flex-row items-center gap-2">
				<h2 className="text-xl font-semibold">Screen parameters</h2>
				{formStatus === "success" && (
					<span className="inline-flex items-center gap-1 text-sm text-green-600">
						<Check className="size-4" />
						Saved
					</span>
				)}
				{formStatus === "error" && (
					<span className="inline-flex items-center gap-1 text-sm text-red-600">
						<AlertCircle className="size-4" />
						{statusMessage || "Error saving"}
					</span>
				)}
			</div>

			<form onSubmit={handleSubmit} className="space-y-4">
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					{Object.entries(paramsSchema).map(([key, definition]) => (
						<div
							key={key}
							className="flex flex-col gap-2 rounded-lg border p-4 shadow-sm"
						>
							<div className="space-y-1">
								<Label htmlFor={key}>{definition.label}</Label>
								{definition.description && (
									<p className="text-sm text-muted-foreground">
										{definition.description}
									</p>
								)}
							</div>
							{renderField(key, definition, values[key], (field, value) =>
								setValues((prev) => ({
									...prev,
									[field]: value,
								})),
							)}
						</div>
					))}
				</div>

				<Button type="submit" disabled={isPending}>
					{isPending ? "Saving..." : "Save parameters"}
				</Button>
				{formStatus === "error" && statusMessage && (
					<p className="text-sm text-red-600">{statusMessage}</p>
				)}
			</form>
		</div>
	);
}

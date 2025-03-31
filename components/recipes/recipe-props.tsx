"use client";

import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";
import { useFormStatus } from "react-dom";

// Refresh button component with loading state
const RefreshButton = ({ slug }: { slug: string }) => {
	const { pending } = useFormStatus();

	return (
		<Button
			type="submit"
			size="sm"
			variant="outline"
			aria-disabled={pending}
			disabled={pending}
		>
			<RefreshCcw className={`size-4 ${pending ? "animate-spin" : ""}`} />{" "}
			Re-run {slug}/getData.ts
		</Button>
	);
};

// Component to render the component props
const RecipeProps = ({
	props,
	slug,
	refreshAction,
}: {
	props: object;
	slug: string;
	refreshAction: (slug: string) => Promise<void>;
}) => {
	if (Object.keys(props).length === 0) return null;

	return (
		<div className="mt-8">
			<form
				action={() => refreshAction(slug)}
				className="flex flex-row gap-2 items-center mb-4"
			>
				<h2 className="text-xl font-semibold">Recipe Props</h2>
				<RefreshButton slug={slug} />
			</form>
			<pre className="p-4 rounded-md overflow-x-auto bg-muted">
				{JSON.stringify(props, null, 2)}
			</pre>
		</div>
	);
};

export default RecipeProps;

"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { deleteRecipe } from "@/app/actions/catalog";
import { Button } from "@/components/ui/button";

export function DeleteRecipeButton({ slug }: { slug: string }) {
	const [isPending, startTransition] = useTransition();

	return (
		<Button
			variant="outline"
			size="sm"
			className="text-destructive hover:text-destructive"
			disabled={isPending}
			onClick={() => {
				if (!confirm("Delete this recipe?")) return;
				startTransition(() => deleteRecipe(slug));
			}}
		>
			<Trash2 className="h-4 w-4 mr-1" />
			{isPending ? "Deleting..." : "Delete"}
		</Button>
	);
}

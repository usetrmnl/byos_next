"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
	deleteMixup,
	fetchMixupWithSlots,
	saveMixupWithSlots,
} from "@/app/actions/mixup";
import { Button } from "@/components/ui/button";
import { slotsToAssignments } from "@/lib/mixup/constants";
import type { Mixup } from "@/lib/types";
import { MixupBuilder, type MixupBuilderData } from "./mixup-builder";
import { MixupList } from "./mixup-list";

type MixupRecipe = {
	slug: string;
	title: string;
	description?: string;
	tags?: string[];
};

interface MixupPageClientProps {
	initialMixups: Mixup[];
	recipes: MixupRecipe[];
}

export function MixupPageClient({
	initialMixups,
	recipes,
}: MixupPageClientProps) {
	const [mixups, setMixups] = useState(initialMixups);
	const [showEditor, setShowEditor] = useState(false);
	const [editingData, setEditingData] = useState<MixupBuilderData | undefined>(
		undefined,
	);
	const [isLoading, setIsLoading] = useState(false);

	const handleCreateMixup = () => {
		setEditingData(undefined);
		setShowEditor(true);
	};

	const handleEditMixup = async (mixup: Mixup) => {
		setIsLoading(true);
		try {
			const { slots } = await fetchMixupWithSlots(mixup.id);
			const assignments = slotsToAssignments(slots);

			setEditingData({
				id: mixup.id,
				name: mixup.name,
				layout_id: mixup.layout_id,
				assignments,
			});
			setShowEditor(true);
		} catch (error) {
			console.error("Error loading mixup:", error);
			toast.error("Failed to load mixup");
		} finally {
			setIsLoading(false);
		}
	};

	const handleSaveMixup = async (data: MixupBuilderData) => {
		setIsLoading(true);
		try {
			const result = await saveMixupWithSlots(data);

			if (result.success) {
				toast.success(
					data.id
						? "Mixup updated successfully!"
						: "Mixup created successfully!",
				);

				// Refresh the page to get updated data
				window.location.reload();
			} else {
				toast.error(result.error || "Failed to save mixup");
			}
		} catch (error) {
			console.error("Error saving mixup:", error);
			toast.error("An unexpected error occurred");
		} finally {
			setIsLoading(false);
		}
	};

	const handleDeleteMixup = async (mixupId: string) => {
		if (!confirm("Are you sure you want to delete this mixup?")) {
			return;
		}

		setIsLoading(true);
		try {
			const result = await deleteMixup(mixupId);

			if (result.success) {
				toast.success("Mixup deleted successfully!");
				// Update local state
				setMixups((prev) => prev.filter((m) => m.id !== mixupId));
			} else {
				toast.error(result.error || "Failed to delete mixup");
			}
		} catch (error) {
			console.error("Error deleting mixup:", error);
			toast.error("An unexpected error occurred");
		} finally {
			setIsLoading(false);
		}
	};

	const handleCancel = () => {
		setShowEditor(false);
		setEditingData(undefined);
	};

	if (showEditor) {
		return (
			<div className="space-y-6">
				<div className="space-y-2">
					<h1 className="text-3xl font-bold">
						{editingData?.id ? "Edit Mixup" : "New Mixup"}
					</h1>
					<p className="text-muted-foreground max-w-2xl">
						{editingData?.id
							? "Modify your mixup layout and recipe assignments."
							: "Blend up to four recipes on the same screen. Choose a layout, drop recipes into each quarter, and preview how they will share space."}
					</p>
				</div>

				<MixupBuilder
					recipes={recipes}
					initialData={editingData}
					onSave={handleSaveMixup}
					onCancel={handleCancel}
					isSaving={isLoading}
				/>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<h1 className="text-3xl font-bold">Mixup</h1>
				<p className="text-muted-foreground max-w-2xl">
					Blend up to four recipes on the same screen. Choose a layout, drop
					recipes into each quarter, and preview how they will share space.
				</p>
			</div>

			<div className="flex justify-between items-center">
				<Button onClick={handleCreateMixup} disabled={isLoading}>
					<Plus className="h-4 w-4 mr-2" />
					New Mixup
				</Button>
			</div>

			<MixupList
				mixups={mixups}
				onEditMixup={handleEditMixup}
				onDeleteMixup={handleDeleteMixup}
				isLoading={isLoading}
			/>
		</div>
	);
}

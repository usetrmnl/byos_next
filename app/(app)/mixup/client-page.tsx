"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
	deleteMixup,
	fetchMixupWithSlots,
	saveMixupWithSlots,
} from "@/app/actions/mixup";
import { PageTemplate } from "@/components/common/page-template";
import {
	MixupBuilder,
	type MixupBuilderData,
} from "@/components/mixup/mixup-builder";
import { MixupList } from "@/components/mixup/mixup-list";
import { Button } from "@/components/ui/button";
import { slotsToAssignments } from "@/lib/mixup/constants";
import type { Mixup } from "@/lib/types";

type MixupRecipe = {
	id: string;
	slug: string;
	title: string;
	description?: string;
};

interface MixupClientPageProps {
	initialMixups: Mixup[];
	recipes: MixupRecipe[];
}

export default function MixupClientPage({
	initialMixups,
	recipes,
}: MixupClientPageProps) {
	const router = useRouter();
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

				setShowEditor(false);
				setEditingData(undefined);
				router.refresh();
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
			<MixupBuilder
				recipes={recipes}
				initialData={editingData}
				onSave={handleSaveMixup}
				onCancel={handleCancel}
				isSaving={isLoading}
			/>
		);
	}

	return (
		<PageTemplate
			title="Mixup"
			subtitle={
				<p className="text-muted-foreground max-w-2xl text-sm">
					Blend up to four recipes on the same screen. Choose a layout, drop
					recipes into each quarter, and preview how they will share space.
				</p>
			}
			left={
				<Button onClick={handleCreateMixup} disabled={isLoading}>
					<Plus className="mr-2 h-4 w-4" />
					New mixup
				</Button>
			}
		>
			<MixupList
				mixups={mixups}
				onEditMixup={handleEditMixup}
				onDeleteMixup={handleDeleteMixup}
				onCreateMixup={handleCreateMixup}
				isLoading={isLoading}
			/>
		</PageTemplate>
	);
}

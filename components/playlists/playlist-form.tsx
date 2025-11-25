import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PlaylistFormProps {
	playlist?: {
		id: string;
		name: string;
	};
	onSave: (data: { name: string }) => void;
	onCancel: () => void;
}

export function PlaylistForm({
	playlist,
	onSave,
	onCancel,
}: PlaylistFormProps) {
	const [name, setName] = useState(playlist?.name || "");

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (name.trim()) {
			onSave({ name: name.trim() });
		}
	};

	return (
		<Card className="w-full max-w-md">
			<CardHeader>
				<CardTitle>{playlist ? "Edit Playlist" : "New Playlist"}</CardTitle>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="name">Playlist Name</Label>
						<Input
							id="name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Enter playlist name"
							required
						/>
					</div>

					<div className="flex gap-2">
						<Button type="submit" disabled={!name.trim()}>
							{playlist ? "Update" : "Create"}
						</Button>
						<Button type="button" variant="outline" onClick={onCancel}>
							Cancel
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}

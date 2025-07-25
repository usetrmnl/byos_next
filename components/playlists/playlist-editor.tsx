import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlaylistForm } from "./playlist-form";
import { PlaylistItem } from "./playlist-item";
import { Plus } from "lucide-react";
import { fetchPlaylistWithItems } from "@/app/actions/playlist";
import screens from "@/app/recipes/screens.json";

interface PlaylistEditorProps {
    playlist?: {
        id: string;
        name: string;
        items: Array<{
            id: string;
            screen_id: string;
            duration: number;
            order_index: number;
            start_time?: string;
            end_time?: string;
            days_of_week?: string[];
        }>;
    };
    onSave: (data: { id?: string; name: string; items: any[] }) => void;
    onCancel: () => void;
}

export function PlaylistEditor({ playlist, onSave, onCancel }: PlaylistEditorProps) {
    const [name, setName] = useState(playlist?.name || "");
    const [items, setItems] = useState(playlist?.items || []);
    const [screenOptions, setScreenOptions] = useState<{ id: string; name: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);


    // Fetch playlist items if editing an existing playlist
    useEffect(() => {
        if (playlist?.id && !playlist.items) {
            setIsLoading(true);
            fetchPlaylistWithItems(playlist.id)
                .then((result) => {
                    if (result.playlist) {
                        setName(result.playlist.name);
                    }
                    setItems(result.items);
                })
                .catch((error) => {
                    console.error("Error fetching playlist items:", error);
                })
                .finally(() => {
                    setIsLoading(false);
                });
            setScreenOptions(Object.entries(screens).map(([id, config]) => ({ id, name: config.title })));
        }
    }, [playlist?.id]);

    const handleSavePlaylist = (data: { name: string }) => {
        setName(data.name);
    };

    const handleAddItem = () => {
        const newItem = {
            id: `temp-${Date.now()}`,
            screen_id: "simple-text",
            duration: 30,
            order_index: items.length,
            start_time: undefined,
            end_time: undefined,
            days_of_week: undefined,
        };
        setItems([...items, newItem]);
    };

    const handleUpdateItem = (id: string, data: any) => {
        setItems(items.map(item =>
            item.id === id ? { ...item, ...data } : item
        ));
    };

    const handleDeleteItem = (id: string) => {
        setItems(items.filter(item => item.id !== id));
    };

    const handleSave = () => {
        if (name.trim()) {
            onSave({
                id: playlist?.id, // Pass the playlist ID if editing
                name: name.trim(),
                items
            });
        }
    };

    return (
        <div className="space-y-6">
            <PlaylistForm
                playlist={playlist ? { id: playlist.id, name } : undefined}
                onSave={handleSavePlaylist}
                onCancel={onCancel}
            />

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Playlist Items</CardTitle>
                        <Button onClick={handleAddItem} size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Item
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Loading playlist items...
                        </div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No items in this playlist. Click "Add Item" to get started.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {items.map((item) => (
                                <PlaylistItem
                                    key={item.id}
                                    item={item}
                                    onUpdate={handleUpdateItem}
                                    onDelete={handleDeleteItem}
                                    screenOptions={screenOptions}
                                />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex gap-2">
                <Button onClick={handleSave} disabled={!name.trim()}>
                    {playlist ? "Update Playlist" : "Create Playlist"}
                </Button>
                <Button variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
            </div>
        </div>
    );
} 
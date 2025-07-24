import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GripVertical, Trash2 } from "lucide-react";

interface PlaylistItemProps {
    item: {
        id: string;
        screen_id: string;
        duration: number;
        order_index: number;
        start_time?: string;
        end_time?: string;
        days_of_week?: string[];
    };
    onUpdate: (id: string, data: Partial<PlaylistItemProps['item']>) => void;
    onDelete: (id: string) => void;
}

// Mock screen options - will be replaced with real data
const screenOptions = [
    { id: "simple-text", name: "Simple Text" },
    { id: "weather", name: "Weather" },
    { id: "bitcoin-price", name: "Bitcoin Price" },
    { id: "wikipedia", name: "Wikipedia" },
    { id: "album", name: "Album" },
];

const daysOfWeek = [
    { value: "monday", label: "Mon" },
    { value: "tuesday", label: "Tue" },
    { value: "wednesday", label: "Wed" },
    { value: "thursday", label: "Thu" },
    { value: "friday", label: "Fri" },
    { value: "saturday", label: "Sat" },
    { value: "sunday", label: "Sun" },
];

export function PlaylistItem({ item, onUpdate, onDelete }: PlaylistItemProps) {
    const handleDayToggle = (day: string) => {
        const currentDays = item.days_of_week || [];
        const isSelected = currentDays.includes(day);
        const updatedDays = isSelected
            ? currentDays.filter(d => d !== day)
            : [...currentDays, day];
        onUpdate(item.id, { days_of_week: updatedDays });
    };

    return (
        <Card className="mb-4">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                        <CardTitle className="text-base">Item {item.order_index + 1}</CardTitle>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDelete(item.id)}
                        className="text-destructive hover:text-destructive"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor={`screen-${item.id}`}>Screen</Label>
                        <Select
                            value={item.screen_id}
                            onValueChange={(value) => onUpdate(item.id, { screen_id: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a screen" />
                            </SelectTrigger>
                            <SelectContent>
                                {screenOptions.map((screen) => (
                                    <SelectItem key={screen.id} value={screen.id}>
                                        {screen.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor={`duration-${item.id}`}>Duration (seconds)</Label>
                        <Input
                            id={`duration-${item.id}`}
                            type="number"
                            min="1"
                            value={item.duration}
                            onChange={(e) => onUpdate(item.id, { duration: parseInt(e.target.value) || 30 })}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor={`start-${item.id}`}>Start Time (optional)</Label>
                        <Input
                            id={`start-${item.id}`}
                            type="time"
                            value={item.start_time || ""}
                            onChange={(e) => onUpdate(item.id, { start_time: e.target.value || undefined })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor={`end-${item.id}`}>End Time (optional)</Label>
                        <Input
                            id={`end-${item.id}`}
                            type="time"
                            value={item.end_time || ""}
                            onChange={(e) => onUpdate(item.id, { end_time: e.target.value || undefined })}
                        />
                    </div>
                </div>

                <div className="space-y-3">
                    <Label>Days of Week (optional)</Label>
                    <div className="flex flex-wrap gap-2">
                        {daysOfWeek.map((day) => {
                            const isSelected = (item.days_of_week || []).includes(day.value);
                            return (
                                <Button
                                    key={day.value}
                                    variant={isSelected ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handleDayToggle(day.value)}
                                    className={`min-w-[3rem] ${isSelected
                                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                            : "hover:bg-muted"
                                        }`}
                                >
                                    {day.label}
                                </Button>
                            );
                        })}
                    </div>
                    {(!item.days_of_week || item.days_of_week.length === 0) && (
                        <p className="text-sm text-muted-foreground">
                            If no days are selected, this item will play every day
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
} 
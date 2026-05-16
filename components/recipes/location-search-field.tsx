"use client";

import { MapPin, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

interface GeoResult {
	displayName: string;
	latitude: number;
	longitude: number;
}

interface LocationSearchFieldProps {
	id: string;
	value: unknown;
	placeholder?: string;
	onChange: (value: string) => void;
}

function parseDisplayName(raw: unknown): string {
	if (typeof raw !== "string" || !raw) return "";
	const sepIdx = raw.indexOf("||");
	return sepIdx !== -1 ? raw.slice(0, sepIdx) : raw;
}

export function LocationSearchField({
	id,
	value,
	placeholder,
	onChange,
}: LocationSearchFieldProps) {
	const displayName = parseDisplayName(value);
	const [open, setOpen] = useState(false);
	const [inputValue, setInputValue] = useState(displayName);
	const [results, setResults] = useState<GeoResult[]>([]);
	const [loading, setLoading] = useState(false);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		setInputValue(parseDisplayName(value));
	}, [value]);

	useEffect(() => {
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, []);

	const handleInput = (text: string) => {
		setInputValue(text);
		onChange(text);

		if (debounceRef.current) clearTimeout(debounceRef.current);

		if (text.trim().length < 2) {
			setResults([]);
			return;
		}

		debounceRef.current = setTimeout(async () => {
			setLoading(true);
			try {
				const res = await fetch(
					`/api/geocode?q=${encodeURIComponent(text.trim())}`,
				);
				if (res.ok) {
					const data = await res.json();
					setResults(data.results ?? []);
					setOpen(true);
				}
			} finally {
				setLoading(false);
			}
		}, 300);
	};

	const handleSelect = (result: GeoResult) => {
		const encoded = `${result.displayName}||${result.latitude},${result.longitude}`;
		setInputValue(result.displayName);
		onChange(encoded);
		setResults([]);
		setOpen(false);
	};

	const handleClear = () => {
		setInputValue("");
		onChange("");
		setResults([]);
		setOpen(false);
	};

	return (
		<Popover open={open && results.length > 0} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<div className="relative flex items-center">
					<MapPin className="absolute left-3 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
					<input
						id={id}
						type="text"
						autoComplete="off"
						value={inputValue}
						placeholder={placeholder ?? "Search for a city or suburb…"}
						onChange={(e) => handleInput(e.target.value)}
						className="flex h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-8 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
					/>
					{loading && (
						<Search className="absolute right-3 h-3.5 w-3.5 text-muted-foreground animate-pulse pointer-events-none" />
					)}
					{!loading && inputValue && (
						<button
							type="button"
							onClick={handleClear}
							className="absolute right-3 text-muted-foreground hover:text-foreground"
						>
							<X className="h-3.5 w-3.5" />
						</button>
					)}
				</div>
			</PopoverTrigger>
			<PopoverContent
				className="w-[--radix-popover-trigger-width] p-0"
				align="start"
			>
				<Command>
					<CommandList>
						<CommandEmpty>No locations found.</CommandEmpty>
						<CommandGroup>
							{results.map((r) => (
								<CommandItem
									key={`${r.latitude},${r.longitude}`}
									onSelect={() => handleSelect(r)}
									className="cursor-pointer"
								>
									<MapPin className="mr-2 h-3.5 w-3.5 text-muted-foreground shrink-0" />
									{r.displayName}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

import { NextResponse } from "next/server";

interface GeocodingResult {
	name: string;
	country: string;
	admin1?: string;
	latitude: number;
	longitude: number;
}

interface GeocodingResponse {
	results?: GeocodingResult[];
}

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const q = searchParams.get("q");

	if (!q || q.trim().length < 2) {
		return NextResponse.json({ error: "q param required" }, { status: 400 });
	}

	const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q.trim())}&count=10&language=en&format=json`;

	let response: Response;
	try {
		response = await fetch(url, {
			headers: { Accept: "application/json" },
			next: { revalidate: 60 },
		});
	} catch {
		return NextResponse.json({ error: "Geocoding API error" }, { status: 502 });
	}

	if (!response.ok) {
		return NextResponse.json({ error: "Geocoding API error" }, { status: 502 });
	}

	const data: GeocodingResponse = await response.json();
	const results = (data.results ?? []).map((r) => ({
		name: r.name,
		country: r.country,
		admin1: r.admin1,
		latitude: r.latitude,
		longitude: r.longitude,
		displayName: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
	}));

	return NextResponse.json({ results });
}

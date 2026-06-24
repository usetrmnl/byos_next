import { readFileSync } from "node:fs";
import { join } from "node:path";
import { connection } from "next/server";
import { BUILT_IN_BITMAP_PACKS } from "@/lib/font-sources";

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ packId: string }> },
) {
	await connection();

	const { packId } = await params;
	const pack = BUILT_IN_BITMAP_PACKS.find((entry) => entry.id === packId);

	if (!pack) {
		return Response.json({ error: "Font pack not found" }, { status: 404 });
	}

	try {
		const absolutePath = join(process.cwd(), pack.packPath);
		const json = readFileSync(absolutePath, "utf8");

		return new Response(json, {
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "no-store, no-cache, must-revalidate",
			},
		});
	} catch {
		return Response.json({ error: "Font pack file missing" }, { status: 500 });
	}
}

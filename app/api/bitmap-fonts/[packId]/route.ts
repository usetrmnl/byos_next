import { readFileSync } from "node:fs";
import { join } from "node:path";
import { connection } from "next/server";
import { BUILT_IN_BITMAP_PACKS } from "@/lib/font-sources";

const BITMAP_FONT_ROOT = join(process.cwd(), "components", "bitmap-font");
const PACK_PATH_PREFIX = "components/bitmap-font/";

function resolvePackDiskPath(packPath: string): string {
	if (!packPath.startsWith(PACK_PATH_PREFIX)) {
		throw new Error(`Unexpected bitmap font pack path: ${packPath}`);
	}

	return join(BITMAP_FONT_ROOT, packPath.slice(PACK_PATH_PREFIX.length));
}

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
		const absolutePath = resolvePackDiskPath(pack.packPath);
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

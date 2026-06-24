import { createHmac } from "crypto";
import { sql } from "kysely";
import { db } from "@/lib/database/db";
import { resolveModelForStorage } from "@/lib/trmnl/model-storage";

const CLAIM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CLAIM_CODE_LENGTH = 8;

type PendingClaimInput = {
	apiKey: string;
	macAddress: string | null;
	model: string | null;
	width: number | null;
	height: number | null;
};

function claimSecret(): string {
	return (
		process.env.BETTER_AUTH_SECRET ||
		process.env.AUTH_SECRET ||
		process.env.DATABASE_URL ||
		"byos-dev-claim-secret"
	);
}

function hmacHex(label: string, value: string): string {
	return createHmac("sha256", claimSecret())
		.update(label)
		.update("\0")
		.update(value)
		.digest("hex");
}

function formatClaimCode(raw: string): string {
	return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

export function normalizeClaimCode(code: string): string {
	return code.replace(/[^a-z0-9]/gi, "").toUpperCase();
}

export function hashClaimCode(code: string): string {
	return hmacHex("device-claim-lookup-v1", normalizeClaimCode(code));
}

export function generateClaimCode(input: PendingClaimInput): string {
	const seed = [
		input.apiKey,
		input.macAddress ?? "",
		input.model ?? "",
		input.width ?? "",
		input.height ?? "",
	].join("\0");
	const bytes = Buffer.from(hmacHex("device-claim-code-v1", seed), "hex");
	let code = "";
	for (let index = 0; index < CLAIM_CODE_LENGTH; index += 1) {
		code += CLAIM_ALPHABET[bytes[index] % CLAIM_ALPHABET.length];
	}
	return formatClaimCode(code);
}

export async function createOrRefreshPendingDeviceClaim(
	input: PendingClaimInput,
): Promise<{ claimCode: string; claimHash: string }> {
	const claimCode = generateClaimCode(input);
	const claimHash = hashClaimCode(claimCode);
	const modelResolution = await resolveModelForStorage(input.model);

	await db
		.insertInto("pending_device_claims")
		.values({
			claim_hash: claimHash,
			api_key: input.apiKey,
			api_key_suffix: input.apiKey.slice(-4),
			mac_address: input.macAddress,
			model: modelResolution.modelName ?? null,
			width: input.width,
			height: input.height,
			last_seen_at: sql`NOW()`,
		})
		.onConflict((oc) =>
			oc.column("claim_hash").doUpdateSet({
				api_key: input.apiKey,
				api_key_suffix: input.apiKey.slice(-4),
				mac_address: input.macAddress,
				model: modelResolution.modelName ?? null,
				width: input.width,
				height: input.height,
				last_seen_at: sql`NOW()`,
			}),
		)
		.execute();

	return { claimCode, claimHash };
}

/// <reference types="jest" />

jest.mock("next/server", () => {
	const actual = jest.requireActual("next/server");
	return {
		...actual,
		connection: jest.fn(async () => undefined),
	};
});

jest.mock("@/lib/database/db", () => ({
	db: {},
}));

jest.mock("@/lib/database/scoped-db", () => ({
	withDeviceApiKey: jest.fn(),
	withExplicitUserScope: jest.fn(),
}));

const checkDbConnection = jest.fn();
jest.mock("@/lib/database/utils", () => ({
	checkDbConnection: (...args: unknown[]) => checkDbConnection(...args),
}));

jest.mock("@/lib/auth/get-user", () => ({
	getCurrentUserId: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
	logError: jest.fn(),
	logInfo: jest.fn(),
	logWarn: jest.fn(),
}));

import { GET } from "./route";

describe("GET /api/setup", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("returns HTTP 500 when an unexpected setup error is caught", async () => {
		checkDbConnection.mockRejectedValue(new Error("database exploded"));

		const response = await GET(
			new Request("http://localhost/api/setup", {
				headers: {
					ID: "AA:BB:CC:DD:EE:FF",
					Model: "og_png",
				},
			}),
		);

		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({
			status: 500,
			error: "Internal server error",
		});
	});
});

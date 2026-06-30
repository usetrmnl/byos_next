/// <reference types="jest" />

const executeTakeFirst = jest.fn();
const where = jest.fn(() => ({ executeTakeFirst }));
const selectAll = jest.fn(() => ({ where }));
const selectFrom = jest.fn(() => ({ selectAll }));

jest.mock("@/lib/database/db", () => ({
	db: {
		selectFrom,
	},
}));

jest.mock("@/lib/database/scoped-db", () => ({
	withDeviceApiKey: jest.fn(async (_apiKey, callback) =>
		callback({ selectFrom }),
	),
	withExplicitUserScope: jest.fn(async (_userId, callback) =>
		callback({ selectFrom }),
	),
}));

jest.mock("@/lib/database/utils", () => ({
	checkDbConnection: jest.fn(async () => ({ ready: true })),
}));

jest.mock("@/lib/auth/get-user", () => ({
	getCurrentUserId: jest.fn(async () => "user-1"),
}));

jest.mock("@/lib/logger", () => ({
	logError: jest.fn(),
	logInfo: jest.fn(),
}));

import { POST } from "./route";

describe("POST /api/log", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		executeTakeFirst.mockResolvedValue(undefined);
	});

	it("rejects malformed log bodies before any device lookup", async () => {
		const response = await POST(
			new Request("http://localhost/api/log", {
				method: "POST",
				headers: {
					"Access-Token": "api-key",
				},
				body: JSON.stringify({ message: "not the TRMNL logs envelope" }),
			}),
		);

		expect(response.status).toBe(422);
		expect(await response.json()).toEqual({
			error: "Invalid request body. Expected { 'logs': [] }",
		});
		expect(selectFrom).not.toHaveBeenCalled();
	});
});

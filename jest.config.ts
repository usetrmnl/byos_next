import type { Config } from "jest";

const config: Config = {
	preset: "ts-jest",
	testEnvironment: "node",
	modulePathIgnorePatterns: ["<rootDir>/.next/"],
	testPathIgnorePatterns: ["/node_modules/", "/.next/"],
	moduleNameMapper: {
		"^@/(.*)$": "<rootDir>/$1",
	},
	transform: {
		"^.+\\.tsx?$": [
			"ts-jest",
			{
				tsconfig: {
					rootDir: ".",
					moduleResolution: "node16",
					module: "node16",
				},
			},
		],
	},
};

export default config;

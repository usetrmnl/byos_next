import fs from "fs";
import path from "path";
import { cache } from "react";

const loadFont = cache(() => {
	try {
		const blockKieFont = Buffer.from(
			fs.readFileSync(path.resolve("./public/fonts/BlockKie.ttf")),
		);
		const geneva9Font = Buffer.from(
			fs.readFileSync(path.resolve("./public/fonts/geneva-9.ttf")),
		);
		const interFont = Buffer.from(
			fs.readFileSync(path.resolve("./public/fonts/Inter_18pt-Regular.ttf")),
		);
		console.log("Fonts loaded successfully");
		return { blockKie: blockKieFont, geneva9: geneva9Font, inter: interFont };
	} catch (error) {
		console.error("Error loading fonts:", error);
		return null;
	}
});

export default loadFont;

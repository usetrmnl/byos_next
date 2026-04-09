"use client";

import { type ReactNode } from "react";
import root from "react-shadow";

export default function WithFramework({ children }: { children: ReactNode }) {
	return (
		<root.div>
			<link rel="stylesheet" href="/framework-ui/plugins.css" />
			<div className="environment trmnl">{children}</div>
		</root.div>
	);
}

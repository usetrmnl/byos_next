import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "TRMNL BYOS",
		short_name: "BYOS",
		description:
			"Self-hosted server and device management dashboard for TRMNL e-ink displays.",
		start_url: "/",
		display: "standalone",
		background_color: "#09090b",
		theme_color: "#09090b",
		icons: [
			{
				src: "/trmnl-icons/trmnl-icon--brand.svg",
				sizes: "any",
				type: "image/svg+xml",
				purpose: "any",
			},
			{
				src: "/trmnl-icons/trmnl-icon--brand.svg",
				sizes: "any",
				type: "image/svg+xml",
				purpose: "maskable",
			},
		],
	};
}

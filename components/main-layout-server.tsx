import { headers } from "next/headers";
import screens from "@/app/(app)/recipes/screens.json";
import tools from "@/app/(app)/tools/tools.json";
import { ClientMainLayout } from "@/components/client-main-layout";
import { auth } from "@/lib/auth/auth";
import {
	getInitData,
	preloadDashboard,
	preloadDevices,
	preloadSystemLogs,
} from "@/lib/getInitData";

const AUTH_ENABLED = process.env.AUTH_ENABLED !== "false";

/**
 * Server Component that handles all data fetching and passes it to client components.
 *
 * This component:
 * 1. Centralizes data fetching through getInitData() which is cached
 * 2. Preloads data for other routes to improve navigation performance
 * 3. Processes recipe and tool data on the server
 * 4. Passes the complete set of server data to ClientMainLayout
 */
export default async function MainLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// Centralized data fetching using getInitData
	// This is cached and shared across all components using React's cache() mechanism
	const { devices, dbStatus } = await getInitData();

	// Fetch session for user info (only if auth is enabled)
	let user: {
		name: string;
		email: string;
		image?: string | null;
		role?: string;
	} | null = null;
	if (auth) {
		const session = await auth.api.getSession({
			headers: await headers(),
		});
		if (session?.user) {
			user = {
				name: session.user.name,
				email: session.user.email,
				image: session.user.image,
				role: (session.user as { role?: string }).role,
			};
		}
	}

	// Start preloading other routes' data - this improves navigation performance
	// The data will be cached and immediately available when the user navigates
	preloadDashboard();
	preloadSystemLogs();
	preloadDevices();

	// Process recipe and tool data on the server to reduce client-side computation
	const recipesComponents = Object.entries(screens)
		.filter(
			([, config]) => process.env.NODE_ENV !== "production" || config.published,
		)
		.sort((a, b) => a[1].title.localeCompare(b[1].title));

	const toolsComponents = Object.entries(tools)
		.filter(
			([, config]) => process.env.NODE_ENV !== "production" || config.published,
		)
		.sort((a, b) => a[1].title.localeCompare(b[1].title));

	// Pass all data to the ClientMainLayout
	// This ensures data is shared across pages through the centralized cache
	return (
		<ClientMainLayout
			devices={devices}
			dbStatus={dbStatus}
			recipesComponents={recipesComponents}
			toolsComponents={toolsComponents}
			user={user}
			authEnabled={AUTH_ENABLED}
		>
			{children}
		</ClientMainLayout>
	);
}

import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getDatabaseSetupStatus } from "@/lib/database/utils";
import SignInForm from "./sign-in-form";

// Next.js Cache Components require that uncached data fetches live inside a
// <Suspense> boundary, so the DB probe is isolated to a child component.
async function SignInWithDbCheck() {
	await connection();
	const setup = await getDatabaseSetupStatus();
	if (setup.needsSetup) {
		redirect("/setup");
	}

	return <SignInForm dbReady={setup.ready} dbError={setup.error} />;
}

export default function SignInPage() {
	console.log({ where: "SignInPage" });
	return (
		<Suspense fallback={<SignInForm dbReady={true} />}>
			<SignInWithDbCheck />
		</Suspense>
	);
}

import { getDbStatus } from "@/lib/database/utils";
import SignInForm from "./sign-in-form";

export default async function SignInPage() {
	const db = await getDbStatus();
	return <SignInForm dbReady={db.ready} dbError={db.error} />;
}

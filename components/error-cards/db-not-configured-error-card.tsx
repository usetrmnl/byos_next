import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { DbStatus } from "@/lib/types";
import { Button } from "../ui/button";

export default function DbNotConfiguredErrorCard({
	status: _status, // for future use
	pageName,
}: {
	status: DbStatus;
	pageName: string;
}) {
	return (
		<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
			<div className="flex justify-center mb-4">
				<AlertCircle className="h-12 w-12 text-destructive" />
			</div>
			<h3 className="text-xl font-semibold mb-2">Database Connection Error</h3>
			<p className="text-muted-foreground mb-6">
				Unable to connect to the database. {pageName} cannot be displayed.
			</p>

			<Button asChild>
				<Link href="/">Go to Dashboard</Link>
			</Button>
		</div>
	);
}

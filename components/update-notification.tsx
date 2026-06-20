"use client";

import { ExternalLink } from "lucide-react";
import Image from "next/image";
import { useEffect } from "react";
import { toast } from "sonner";
import { getServerUpdateInfo } from "@/app/actions/version";
import { Button } from "@/components/ui/button";

const SKIP_VERSION_STORAGE_KEY = "byos:update-skip-version";

interface UpdateNotificationProps {
	/**
	 * Only operators should be nagged about server updates. Pass false for
	 * non-admin users when auth is enabled.
	 */
	enabled?: boolean;
}

/**
 * Headless component: checks for a newer BYOS server release on mount and, if
 * one is available, surfaces it as a persistent custom Sonner toast.
 */
export function UpdateNotification({
	enabled = true,
}: UpdateNotificationProps) {
	useEffect(() => {
		if (!enabled) return;

		let cancelled = false;

		(async () => {
			try {
				const result = await getServerUpdateInfo();
				if (cancelled || !result?.isUpdateAvailable) return;

				const skipped = localStorage.getItem(SKIP_VERSION_STORAGE_KEY);
				if (skipped === result.latestVersion) return;

				const toastId = `byos-update-${result.latestVersion}`;

				// Remember this version so we don't nag again once acknowledged.
				const skip = () => {
					try {
						localStorage.setItem(
							SKIP_VERSION_STORAGE_KEY,
							result.latestVersion,
						);
					} catch {
						// localStorage unavailable (private mode) — ignore.
					}
				};

				toast.custom(
					() => (
						<div className="flex w-full items-start gap-3 rounded-lg border bg-popover p-4 text-popover-foreground shadow-lg">
							<Image
								src="/trmnl-icons/trmnl-icon--brand.svg"
								alt="TRMNL"
								width={36}
								height={36}
								className="mt-0.5 shrink-0 rounded-md"
							/>
							<div className="flex-1">
								<p className="text-sm font-semibold leading-none">
									Update available
								</p>
								<p className="mt-1.5 text-sm text-muted-foreground">
									BYOS v{result.latestVersion} is available — you're on v
									{result.currentVersion}.
								</p>
								<div className="mt-3 flex items-center gap-2">
									<Button
										size="sm"
										className="h-7 bg-[#F8654B] px-2.5 text-xs text-white hover:bg-[#F8654B]/90"
										onClick={() => {
											skip();
											window.open(
												result.releaseUrl,
												"_blank",
												"noopener,noreferrer",
											);
											toast.dismiss(toastId);
										}}
									>
										View release
										<ExternalLink className="size-3.5" />
									</Button>
									<Button
										size="sm"
										variant="ghost"
										className="h-7 px-2.5 text-xs text-muted-foreground"
										onClick={() => {
											skip();
											toast.dismiss(toastId);
										}}
									>
										Dismiss
									</Button>
								</div>
							</div>
						</div>
					),
					{
						id: toastId,
						duration: Number.POSITIVE_INFINITY,
						unstyled: true,
					},
				);
			} catch (error) {
				console.error("Update check failed:", error);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [enabled]);

	return null;
}

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
export default function SystemLogsViewerSkeleton({
	className,
}: {
	className?: string;
}) {
	return (
		<div className={cn("space-y-4", className)}>
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<Skeleton className="h-10 w-full md:w-2/3" />
				<Skeleton className="h-10 w-full md:w-[180px]" />
			</div>

			<div className="flex">
				<Skeleton className="h-10 w-full" />
			</div>

			<Card className="overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead>
							<tr className="border-b bg-muted/50">
								<th className="px-4 py-3 text-left text-sm font-medium">
									<Skeleton className="h-4 w-24" />
								</th>
								<th className="px-4 py-3 text-left text-sm font-medium">
									<Skeleton className="h-4 w-16" />
								</th>
								<th className="px-4 py-3 text-left text-sm font-medium">
									<Skeleton className="h-4 w-20" />
								</th>
								<th className="px-4 py-3 text-left text-sm font-medium">
									<Skeleton className="h-4 w-32" />
								</th>
								<th className="px-4 py-3 text-left text-sm font-medium">
									<Skeleton className="h-4 w-20" />
								</th>
							</tr>
						</thead>
						<tbody>
							{Array.from({ length: 10 }).map((_, i) => (
								<tr key={i} className="border-b">
									<td className="px-4 py-3">
										<Skeleton className="h-4 w-24" />
									</td>
									<td className="px-4 py-3">
										<Skeleton className="h-4 w-16" />
									</td>
									<td className="px-4 py-3">
										<Skeleton className="h-4 w-20" />
									</td>
									<td className="px-4 py-3">
										<Skeleton className="h-4 w-full max-w-[200px]" />
									</td>
									<td className="px-4 py-3">
										<Skeleton className="h-4 w-20" />
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</Card>

			<div className="flex flex-col items-center justify-between gap-4 md:flex-row">
				<Skeleton className="h-5 w-48" />
				<div className="flex items-center gap-2">
					<Skeleton className="h-9 w-20" />
					<Skeleton className="h-9 w-9" />
					<Skeleton className="h-9 w-9" />
					<Skeleton className="h-9 w-9" />
					<Skeleton className="h-9 w-20" />
				</div>
			</div>
		</div>
	);
}

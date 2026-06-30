"use client";

import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";

function getPageNumbers(
	page: number,
	totalPages: number,
): (number | "ellipsis")[] {
	const pages: (number | "ellipsis")[] = [];
	if (totalPages <= 5) {
		for (let i = 1; i <= totalPages; i++) pages.push(i);
	} else if (page <= 3) {
		for (let i = 1; i <= Math.min(5, totalPages); i++) pages.push(i);
		if (totalPages > 5) {
			pages.push("ellipsis");
			pages.push(totalPages);
		}
	} else if (page >= totalPages - 2) {
		pages.push(1);
		pages.push("ellipsis");
		for (let i = totalPages - 4; i <= totalPages; i++) {
			if (i > 1) pages.push(i);
		}
	} else {
		pages.push(1);
		pages.push("ellipsis");
		for (let i = page - 1; i <= page + 1; i++) pages.push(i);
		pages.push("ellipsis");
		pages.push(totalPages);
	}
	return pages;
}

export function LogPagination({
	page,
	perPage,
	totalItems,
	onPageChange,
	itemLabel = "logs",
}: {
	page: number;
	perPage: number;
	totalItems: number;
	onPageChange: (page: number) => void;
	itemLabel?: string;
}) {
	const totalPages = Math.ceil(totalItems / perPage);
	if (totalItems === 0 || totalPages === 0) return null;

	const showingFrom = (page - 1) * perPage + 1;
	const showingTo = Math.min(page * perPage, totalItems);

	return (
		<div className="flex flex-col items-center justify-between gap-4 md:flex-row">
			<div className="text-sm text-muted-foreground">
				Showing <span className="font-medium">{showingFrom}</span> to{" "}
				<span className="font-medium">{showingTo}</span> of{" "}
				<span className="font-medium">{totalItems}</span> {itemLabel}
			</div>

			<Pagination>
				<PaginationContent>
					<PaginationItem>
						<PaginationPrevious
							onClick={() => page > 1 && onPageChange(page - 1)}
							className={
								page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"
							}
						/>
					</PaginationItem>

					{getPageNumbers(page, totalPages).map((pageNum, i) =>
						pageNum === "ellipsis" ? (
							<PaginationItem key={`ellipsis-${i}`}>
								<PaginationEllipsis />
							</PaginationItem>
						) : (
							<PaginationItem key={pageNum}>
								<PaginationLink
									isActive={page === pageNum}
									onClick={() => onPageChange(pageNum)}
									className="cursor-pointer"
								>
									{pageNum}
								</PaginationLink>
							</PaginationItem>
						),
					)}

					<PaginationItem>
						<PaginationNext
							onClick={() => page < totalPages && onPageChange(page + 1)}
							className={
								page >= totalPages
									? "pointer-events-none opacity-50"
									: "cursor-pointer"
							}
						/>
					</PaginationItem>
				</PaginationContent>
			</Pagination>
		</div>
	);
}

"use client";

import {
	ChevronsUpDown,
	LogOut,
	Mail,
	MessageSquare,
	Settings,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth/auth-client";
import packageJson from "@/package.json";

interface NavUserProps {
	user: {
		name: string;
		email: string;
		image?: string | null;
		role?: string;
	};
}

export function NavUser({ user }: NavUserProps) {
	const { isMobile } = useSidebar();
	const router = useRouter();

	const getUserInitials = () => {
		if (user.name) {
			const parts = user.name.split(" ");
			if (parts.length >= 2) {
				return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
			}
			return user.name[0].toUpperCase();
		}
		if (user.email) {
			return user.email[0].toUpperCase();
		}
		return "U";
	};

	const handleSignOut = async () => {
		await authClient.signOut();
		router.push("/sign-in");
		router.refresh();
	};

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						>
							<Avatar className="h-8 w-8 rounded-lg">
								{user.image && <AvatarImage src={user.image} alt={user.name} />}
								<AvatarFallback className="rounded-lg">
									{getUserInitials()}
								</AvatarFallback>
							</Avatar>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-medium">{user.name}</span>
								<span className="truncate text-xs text-sidebar-foreground/70">
									{user.email}
								</span>
							</div>
							<ChevronsUpDown className="ml-auto size-4" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
						side={isMobile ? "bottom" : "right"}
						align="end"
						sideOffset={4}
					>
						<DropdownMenuLabel className="p-0 font-normal">
							<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
								<Avatar className="h-8 w-8 rounded-lg">
									{user.image && (
										<AvatarImage src={user.image} alt={user.name} />
									)}
									<AvatarFallback className="rounded-lg">
										{getUserInitials()}
									</AvatarFallback>
								</Avatar>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-medium">{user.name}</span>
									<span className="truncate text-xs text-muted-foreground">
										{user.email}
									</span>
								</div>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						{user.role === "admin" && (
							<>
								<DropdownMenuGroup>
									<DropdownMenuItem asChild>
										<Link href="/admin/users">
											<Settings className="mr-2 size-4" />
											Manage users
										</Link>
									</DropdownMenuItem>
								</DropdownMenuGroup>
								<DropdownMenuSeparator />
							</>
						)}
						<DropdownMenuGroup>
							<DropdownMenuItem asChild>
								<Link
									href="https://github.com/usetrmnl/byos_next/issues"
									target="_blank"
								>
									<MessageSquare className="mr-2 size-4" />
									Report an issue
								</Link>
							</DropdownMenuItem>
							<DropdownMenuItem asChild>
								<Link
									href={`mailto:manglekuo@gmail.com?subject=BYOS%20v${packageJson.version}%20Feedback`}
								>
									<Mail className="mr-2 size-4" />
									Send feedback
								</Link>
							</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={handleSignOut}>
							<LogOut className="mr-2 size-4" />
							Sign out
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}

// Fallback for when auth is disabled or no user
export function NavUserFallback() {
	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<div className="flex items-center gap-2 px-2 py-1.5">
					<Image
						src="/trmnl-glyphs/trmnl-glyph--brand.svg"
						alt="TRMNL"
						width={24}
						height={24}
						className="opacity-50"
					/>
					<span className="text-xs text-muted-foreground font-mono">
						v{packageJson.version}
					</span>
				</div>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}

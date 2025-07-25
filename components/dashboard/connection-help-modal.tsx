"use client";

import { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink } from "lucide-react";
import Image from "next/image";

interface ConnectionHelpModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export default function ConnectionHelpModal({
	isOpen,
	onClose,
}: ConnectionHelpModalProps) {
	const [activeTab, setActiveTab] = useState("vercel");

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
				<DialogHeader>
					<DialogTitle>How to Get Your PostgreSQL Connection URL</DialogTitle>
				</DialogHeader>

				<Tabs
					value={activeTab}
					onValueChange={setActiveTab}
					className="flex-1 overflow-hidden"
				>
					<TabsList className="grid w-full grid-cols-3">
						<TabsTrigger value="vercel">Deploy with Vercel</TabsTrigger>
						<TabsTrigger value="manual">Self Host / Manual Setup</TabsTrigger>
						<TabsTrigger value="alternatives">Run SQL Manually</TabsTrigger>
					</TabsList>

					<div className="flex-1 overflow-y-auto mt-4">
						<TabsContent value="vercel" className="h-full">
							<div className="space-y-6">
								<div className="rounded-md bg-amber-950 p-4 text-amber-200 text-sm">
									<p className="font-medium">
										Using Vercel with Supabase Integration
									</p>
									<p className="mt-2">
										If you&apos;re deploying with Vercel and using Supabase, you
										can automatically sync your environment variables.
									</p>
								</div>

								<div className="grid gap-6">
									<div>
										<h3 className="text-lg font-medium mb-2">
											1. Install Supabase Integration
										</h3>
										<div className="relative aspect-[16/9] rounded-lg overflow-hidden border border-gray-800">
											<Image
												src="https://sjc.microlink.io/hvN9sKU3Wwf8pPTquli9Ud6gQQ2JyhG95TiV6nuFNpoziCo5794sbFBpqFIucugFPbKcqETiq2Sxp9W6I-xRcA.jpeg"
												alt="Supabase Integration on Vercel Marketplace"
												fill
												className="object-cover"
											/>
										</div>
										<div className="mt-2 flex items-center gap-2">
											<a
												href="https://vercel.com/marketplace/supabase"
												target="_blank"
												rel="noopener noreferrer"
												className="text-sm text-blue-400 hover:underline inline-flex items-center"
											>
												Install Supabase Integration
												<ExternalLink className="h-3 w-3 ml-1" />
											</a>
										</div>
									</div>

									<div>
										<h3 className="text-lg font-medium mb-2">
											2. Configure Environment Variables
										</h3>
										<div className="relative aspect-[16/9] rounded-lg overflow-hidden border border-gray-800">
											<Image
												src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-03-06%20at%209.43.51%E2%80%AFam-Vqw7XyC6QP8xpIDfLHoYUmUL87BnXg.png"
												alt="Vercel Environment Variable Configuration"
												fill
												className="object-cover"
											/>
										</div>
									</div>

									<div className="space-y-4">
										<h3 className="text-lg font-medium">
											3. Set Up Local Development
										</h3>
										<div className="bg-gray-900 rounded-md p-4 text-sm">
											<p className="text-gray-300">
												Once setup, sync environment variables to your local
												development:
											</p>
											<ol className="list-decimal list-inside mt-2 space-y-2 text-gray-300">
												<li>
													Go to{" "}
													<a
														href="https://supabase.com/dashboard/project/_/settings/integrations"
														target="_blank"
														rel="noopener noreferrer"
														className="text-blue-400 hover:underline inline-flex items-center"
													>
														Supabase Integrations
														<ExternalLink className="h-3 w-3 ml-1" />
													</a>
												</li>
												<li>
													If not linked already, link your Supabase project to
													Vercel
												</li>
												<li>
													Under Vercel Integration, find &quot;manage&quot;,
													turn on &quot;preview&quot; and
													&quot;development&quot;, and then &quot;Resync
													environment variables&quot;
												</li>
												<li>
													Now using{" "}
													<code className="bg-gray-800 px-1 rounded">
														vercel link
													</code>{" "}
													and{" "}
													<code className="bg-gray-800 px-1 rounded">
														vercel env pull
													</code>
													, you should see these environment variables in your
													local{" "}
													<code className="bg-gray-800 px-1 rounded">
														.env.local
													</code>{" "}
													file
												</li>
											</ol>

											<div className="mt-4 bg-gray-800 p-2 rounded-md font-mono text-xs text-gray-300">
												<pre>
													{`NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_URL
POSTGRES_DATABASE
POSTGRES_HOST
POSTGRES_PASSWORD
POSTGRES_PRISMA_URL
POSTGRES_URL # we transform this to get the PostgreSQL connection URL
POSTGRES_URL_NON_POOLING
POSTGRES_USER
SUPABASE_ANON_KEY
SUPABASE_JWT_SECRET
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_URL`}
												</pre>
											</div>
										</div>

										<div className="bg-gray-900 rounded-md p-4">
											<h4 className="font-medium text-white mb-2">
												Helpful Links:
											</h4>
											<ul className="space-y-2 text-sm">
												<li>
													<a
														href="https://vercel.com/docs/storage/vercel-postgres/quickstart"
														target="_blank"
														rel="noopener noreferrer"
														className="text-blue-400 hover:underline inline-flex items-center"
													>
														Vercel Postgres Quickstart
														<ExternalLink className="h-3 w-3 ml-1" />
													</a>
												</li>
												<li>
													<a
														href="https://supabase.com/docs/guides/integrations/vercel"
														target="_blank"
														rel="noopener noreferrer"
														className="text-blue-400 hover:underline inline-flex items-center"
													>
														Supabase Vercel Integration Guide
														<ExternalLink className="h-3 w-3 ml-1" />
													</a>
												</li>
												<li>
													<a
														href="https://vercel.com/guides/using-supabase-with-vercel"
														target="_blank"
														rel="noopener noreferrer"
														className="text-blue-400 hover:underline inline-flex items-center"
													>
														Using Supabase with Vercel Guide
														<ExternalLink className="h-3 w-3 ml-1" />
													</a>
												</li>
											</ul>
										</div>
									</div>
								</div>
							</div>
						</TabsContent>

						<TabsContent value="manual" className="h-full">
							<div className="space-y-6">
								<div className="rounded-md bg-amber-950 p-4 text-amber-200 text-sm">
									<p className="font-medium">Manual Setup</p>
									<p className="mt-2">
										If you&apos;re not using Vercel or need to manually set up
										your connection, follow these steps.
									</p>
								</div>

								<div className="space-y-4">
									<h3 className="text-lg font-medium">
										Get Your Connection URL
									</h3>
									<ol className="list-decimal list-inside space-y-4 text-sm text-gray-500">
										<li>
											<div>
												<p>
													Go to{" "}
													<a
														href="https://supabase.com/dashboard/project/_/settings/database"
														target="_blank"
														rel="noopener noreferrer"
														className="text-blue-400 hover:underline inline-flex items-center"
													>
														Supabase Database Settings
														<ExternalLink className="h-3 w-3 ml-1" />
													</a>{" "}
													and click on &quot;Connection Pooling&quot; tab
												</p>
												<p className="mt-1 text-gray-400">
													You&apos;ll find your connection string under
													&quot;Connection string&quot; but it won&apos;t
													include your password for security reasons.
												</p>
											</div>
										</li>
										<li>
											<div>
												<p className="font-medium">
													For the password, you have two options:
												</p>
												<ul className="list-disc list-inside ml-4 mt-2 space-y-2">
													<li>
														<p>
															<span className="font-medium">Option A:</span> Go
															to{" "}
															<a
																href="https://supabase.com/dashboard/project/_/settings/database"
																target="_blank"
																rel="noopener noreferrer"
																className="text-blue-400 hover:underline inline-flex items-center"
															>
																Database Settings
																<ExternalLink className="h-3 w-3 ml-1" />
															</a>{" "}
															and click &quot;Reset database password&quot; to
															get a new password
														</p>
													</li>
													<li>
														<p>
															<span className="font-medium">Option B:</span> If
															you already know your database password, use that
															in the connection string
														</p>
													</li>
												</ul>
											</div>
										</li>
										<li>
											<div>
												<p>
													Replace the{" "}
													<code className="bg-gray-800 px-1 rounded">
														[YOUR-PASSWORD]
													</code>{" "}
													in the connection URL with your actual password
												</p>
												<p className="mt-1 text-gray-400">
													The final URL should look like:{" "}
													<code className="bg-gray-800 px-1 rounded">
														postgresql://postgres:your_actual_password@db.example.supabase.co:5432/postgres
													</code>
												</p>
											</div>
										</li>
									</ol>

									<div className="rounded-md bg-gray-900 p-4 mt-4">
										<h4 className="font-medium text-white">
											Important Security Notes:
										</h4>
										<ul className="list-disc list-inside mt-2 space-y-2 text-sm text-gray-300">
											<li>
												Never commit your database password to version control
											</li>
											<li>
												Consider using environment variables to store sensitive
												connection information
											</li>
											<li>
												For production applications, use connection pooling for
												better performance
											</li>
										</ul>
									</div>
								</div>
							</div>
						</TabsContent>

						<TabsContent value="alternatives" className="h-full">
							<div className="space-y-6">
								<div className="space-y-4">
									<h3 className="text-lg font-medium">Run SQL Manually</h3>
									<p className="text-sm text-gray-500">
										You can run the SQL statements directly in your Supabase SQL
										Editor:
									</p>
									<ol className="list-decimal list-inside space-y-2 text-sm text-gray-500">
										<li>Go to the Supabase Dashboard for your project</li>
										<li>Navigate to the SQL Editor</li>
										<li>Copy the SQL statements from this workflow</li>
										<li>Paste and execute them in the SQL Editor</li>
									</ol>

									<div className="mt-4 bg-gray-800 p-2 rounded-md font-mono text-xs text-gray-300">
										<pre>
											{`-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Playlists Table
CREATE TABLE public.playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Playlist Items Table
CREATE TABLE public.playlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID REFERENCES public.playlists(id) ON DELETE CASCADE,
  screen_id TEXT NOT NULL,
  duration INT NOT NULL DEFAULT 30,
  start_time TIME,
  end_time TIME,
  days_of_week JSONB,
  order_index INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Devices Table
CREATE TABLE public.devices (
  id BIGSERIAL PRIMARY KEY,
  friendly_id VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  mac_address VARCHAR NOT NULL UNIQUE,
  api_key VARCHAR NOT NULL UNIQUE,
  screen VARCHAR NULL DEFAULT NULL,
  refresh_schedule JSONB NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  last_update_time TIMESTAMPTZ NULL,
  next_expected_update TIMESTAMPTZ NULL,
  last_refresh_duration INTEGER NULL,
  battery_voltage NUMERIC NULL,
  firmware_version TEXT NULL,
  rssi INTEGER NULL,
  playlist_id UUID REFERENCES public.playlists(id),
  use_playlist BOOLEAN DEFAULT FALSE,
  current_playlist_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Devices
CREATE INDEX idx_devices_refresh_schedule ON public.devices USING GIN (refresh_schedule);

-- Logs Table
CREATE TABLE public.logs (
  id BIGSERIAL PRIMARY KEY,
  friendly_id TEXT NULL,
  log_data TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT logs_friendly_id_fkey FOREIGN KEY (friendly_id) REFERENCES public.devices (friendly_id)
);

-- System Logs Table
CREATE TABLE public.system_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  level VARCHAR NOT NULL,
  message TEXT NOT NULL,
  source VARCHAR NULL,
  metadata TEXT NULL,
  trace TEXT NULL
);

-- Indexes for System Logs
CREATE INDEX idx_system_logs_created_at ON public.system_logs (created_at);
CREATE INDEX idx_system_logs_level ON public.system_logs (level);`}
										</pre>
									</div>
								</div>
							</div>
						</TabsContent>
					</div>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}

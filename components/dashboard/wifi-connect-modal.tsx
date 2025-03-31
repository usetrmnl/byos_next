"use client";

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LockIcon, WifiIcon, EyeIcon } from "lucide-react";
import Image from "next/image";
interface WifiConnectModalProps {
	customServerUrl?: string;
	helpText?: string;
}

export default function WifiConnectModal({
	customServerUrl = "https://byos-nextjs.vercel.app",
	helpText = "help",
}: WifiConnectModalProps) {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<a
					className="underline"
					href="#"
					tabIndex={0}
					aria-label="Open WiFi setup help"
				>
					{helpText}
				</a>
			</DialogTrigger>
			<DialogContent className="block w-full max-w-full md:max-w-5xl p-0 overflow-hidden">
				<ScrollArea className="h-[90vh] w-full overflow-y-auto px-2 md:px-4 lg:px-6">
					<div className="py-4">
						<DialogHeader>
							<DialogTitle className="text-xl text-center mt-2">
								Connect Your TRMNL Device
							</DialogTitle>
						</DialogHeader>

						{/* Step 0 - Connect to TRMNL WiFi */}
						<div className="mt-6 pb-6 mb-6 border-b border-gray-200 dark:border-gray-700">
							<h3 className="font-bold text-md">
								Start by resetting the device,
							</h3>
							<p className="text-sm text-gray-400 dark:text-gray-600">
								Hold the button at the back of the device for 5 seconds.
							</p>
							<h3 className="font-bold text-md mt-1">
								...and connect to TRMNL WiFi
							</h3>
							<p className="text-sm text-gray-400 dark:text-gray-600">
								Connect to the <strong>TRMNL</strong> WiFi network and wait for
								the captive portal to appear
							</p>
							<div className="mt-2 bg-white dark:bg-gray-800 py-2 px-4 rounded-lg border border-gray-200 dark:border-gray-700">
								<div className="pb-2 border-b border-gray-100 dark:border-gray-700 font-medium">
									WiFi Settings
								</div>
								<div className="flex items-center justify-between pt-2">
									<div className="flex items-center">
										<WifiIcon className="w-4 h-4 mr-2" /> <span>TRMNL</span>
									</div>
									<span className="text-blue-500">✓</span>
								</div>
							</div>
						</div>

						{/* Main content - responsive layout using Tailwind classes */}
						<div className="mt-6 flex flex-col space-y-6 md:grid md:grid-cols-2 md:gap-6 md:items-start md:space-y-0">
							{/* Phone mockup with responsive container */}
							<div className="flex justify-center md:justify-start">
								{/* Phone container with progressive scaling based on viewport width */}
								<div
									className="w-[280px] h-auto max-h-[80vh] md:h-[750px] transition-all duration-300 
                               sm:w-[300px] md:w-[300px] lg:w-[320px] xl:w-[340px]
                               transform-gpu origin-top-left
                               sm:scale-100 md:scale-100 lg:scale-100 xl:scale-100"
								>
									{/* Phone mockup using pure Tailwind */}
									<div className="bg-white dark:text-black rounded-[24px] shadow-[0_0_0_8px_#e2e8f0,0_0_0_12px_#94a3b8] overflow-hidden relative w-full translate-x-[12px] translate-y-[12px]">
										{/* Status bar */}
										<div className="flex justify-between items-center px-4 py-3 bg-gray-50 rounded-t-xl mb-1">
											<div className="text-[10px] font-medium">9:49</div>
											<div className="flex gap-1">
												<WifiIcon className="w-4 h-4" aria-hidden="true" />
											</div>
										</div>

										{/* Phone content */}
										<div className="p-3 bg-white rounded-lg min-h-[400px] text-sm sm:min-h-[350px] md:min-h-[450px]">
											<Image
												src="/static/trmnl-logo.svg?height=40&width=120"
												alt="Logo"
												className="mx-auto w-1/2 mb-4"
												width={120}
												height={40}
											/>

											<h1 className="text-xl font-bold text-center mb-4">
												Wi-Fi Configuration
											</h1>

											<div className="space-y-2">
												{/* Step 1 - Select WiFi network */}
												<div className="relative">
													<div className="absolute top-4 -right-2 size-6 rounded-full bg-red-500/80 text-white flex items-center justify-center font-bold z-10 border-2 border-white">
														1
													</div>

													<table className="w-full bg-white overflow-hidden border-spacing-1 border-collapse">
														<caption className="text-left text-gray-500 pb-1 text-sm">
															Networks
														</caption>
														<tbody>
															<tr className="h-[30px] border-b border-gray-200 text-sm bg-gray-50">
																<th className="text-left pl-2">MyNetwork</th>
																<td className="text-right">
																	<div className="flex items-center justify-end gap-2 pr-2">
																		<WifiIcon
																			className="w-4 h-4"
																			aria-hidden="true"
																		/>
																		<LockIcon
																			className="w-4 h-4"
																			aria-hidden="true"
																		/>
																	</div>
																</td>
															</tr>
															<tr className="h-[30px] text-sm bg-gray-50">
																<th className="text-left pl-2">
																	Neighbor_WiFi
																</th>
																<td className="text-right">
																	<div className="flex items-center justify-end gap-2 pr-2">
																		<WifiIcon
																			className="w-4 h-4"
																			aria-hidden="true"
																		/>
																		<LockIcon
																			className="w-4 h-4"
																			aria-hidden="true"
																		/>
																	</div>
																</td>
															</tr>
														</tbody>
													</table>
												</div>

												<div className="relative">
													<div className="flex flex-col items-start w-full">
														<Label htmlFor="ssid" className="text-sm mb-1">
															SSID
														</Label>
														<div
															className="w-full px-2 py-1 border border-gray-300 rounded-md bg-white text-sm focus:border-[#F86527] focus:border-2"
															role="textbox"
															aria-readonly="true"
														>
															MyNetwork
														</div>
													</div>
												</div>

												{/* Step 2 - Enter WiFi password */}
												<div className="relative">
													<div className="absolute top-4 -right-2 size-6 rounded-full bg-red-500/80 text-white flex items-center justify-center font-bold z-10 border-2 border-white">
														2
													</div>

													<div className="flex flex-col items-start w-full relative">
														<Label htmlFor="password" className="text-sm mb-1">
															Password
														</Label>
														<div className="relative w-full">
															<div
																className="w-full px-2 py-1 border border-gray-300 rounded-md bg-white text-sm pr-10 focus:border-[#F86527] focus:border-2"
																role="textbox"
																aria-readonly="true"
															>
																••••••••
															</div>
															<EyeIcon
																className="absolute top-1/2 right-2 -translate-y-1/2 w-4 h-4 text-gray-500"
																aria-hidden="true"
															/>
														</div>
													</div>
												</div>

												{/* Step 3 - Click Custom Server */}
												<div className="relative">
													<div className="absolute -top-2 left-23 size-6 rounded-full bg-red-500/80 text-white flex items-center justify-center font-bold z-10 border-2 border-white">
														3
													</div>

													<div className="flex flex-wrap gap-2 my-4">
														<div className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-[#343a40] text-white px-3 py-2">
															Soft Reset
														</div>
														<div className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-gray-100 text-gray-900 px-3 py-2 ring-2 ring-blue-400">
															Custom Server
														</div>
													</div>
												</div>

												<div className="relative">
													{/* Custom Server Modal */}
													<div className="border border-gray-300 rounded-lg p-2 bg-gray-50 mb-4 text-xs">
														<p className="mb-2">
															This button allows you to specify a custom API
															server (also known as BYOS) for your device. Most
															users don&apos;t want this, and will use the
															official server with their TRMNL. Are you sure you
															want to have a custom server specified?
														</p>
														<div className="flex justify-end gap-2">
															<div className="inline-flex h-7 items-center justify-center rounded-sm px-3 text-xs font-medium bg-[#F86527] text-white ring-2 ring-blue-400">
																Yes
															</div>
															<div className="inline-flex h-7 items-center justify-center rounded-sm px-3 text-xs font-medium bg-gray-100 text-gray-900">
																No
															</div>
														</div>
													</div>
												</div>

												{/* Step 4 - Enter custom server URL */}
												<div className="relative">
													<div className="absolute top-2 -right-2 size-6 rounded-full bg-red-500/80 text-white flex items-center justify-center font-bold z-10 border-2 border-white">
														4
													</div>

													<div className="flex flex-col items-start mb-3 w-full">
														<Label htmlFor="server" className="text-sm mb-1">
															API Server
														</Label>
														<div
															className="w-full px-2 py-1 border border-[#F86527] rounded-md bg-white text-sm focus:border-[#F86527] focus:border-2"
															role="textbox"
															aria-readonly="true"
														>
															{customServerUrl}
														</div>
													</div>
												</div>

												{/* Step 5 - Click Connect */}
												<div className="relative">
													<div className="absolute -top-2 -left-2 size-6 rounded-full bg-red-500/80 text-white flex items-center justify-center font-bold z-10 border-2 border-white">
														5
													</div>

													<div className="flex flex-wrap gap-2">
														<div className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-[#F86527] text-white px-3 py-2 ring-2 ring-blue-400">
															Connect
														</div>
														<div className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-gray-100 text-gray-900 px-3 py-2">
															Refresh
														</div>
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>

							{/* Instructions */}
							<div className="space-y-6">
								<div className="p-4 rounded-md border border-gray-200 dark:border-gray-700">
									<ol className="list-decimal pl-5 space-y-3">
										<li className="mb-3">
											<strong>Select your WiFi network</strong>
											<p className="text-sm text-gray-600 mt-1">
												From the list of available networks, select the WiFi
												network you want your IoT device to connect to.
											</p>
										</li>

										<li className="mb-3">
											<strong>Enter WiFi password</strong>
											<p className="text-sm text-gray-600 mt-1">
												Type in the password for your selected WiFi network.
											</p>
										</li>

										<li className="mb-3">
											<strong>Enable Custom Server</strong>
											<p className="text-sm text-gray-600 mt-1">
												Click the <strong>Custom Server</strong> button at the
												bottom of the screen. When prompted with the
												confirmation dialog, click <strong>Yes</strong>.
											</p>
										</li>

										<li className="mb-3">
											<strong>Enter your custom server URL</strong>
											<p className="text-sm text-gray-600 mt-1">
												In the API Server field, enter:
												<code className="block bg-muted text-muted-foreground p-2 rounded mt-1 font-mono text-sm break-all">
													{customServerUrl}
												</code>
											</p>
										</li>

										<li>
											<strong>Connect</strong>
											<p className="text-sm text-gray-600 mt-1">
												Click the <strong>Connect</strong> button to complete
												the setup.
											</p>
										</li>
									</ol>
								</div>
							</div>
						</div>
					</div>
				</ScrollArea>
			</DialogContent>
		</Dialog>
	);
}

"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Upload,
	Download,
	ImageIcon,
	ZoomIn,
	ZoomOut,
	Sliders,
	Copy,
} from "lucide-react";

export default function ImageDitherer() {
	const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(
		null,
	);
	const [ditheringMethod, setDitheringMethod] = useState("floydSteinberg");
	const [brightness, setBrightness] = useState([0]);
	const [contrast, setContrast] = useState([0]);
	const [threshold, setThreshold] = useState([128]);
	const [patternSize, setPatternSize] = useState([4]);
	const [inverted, setInverted] = useState(false);
	const [zoom, setZoom] = useState(1);
	const [showControls, setShowControls] = useState(true);
	const [copyStatus, setCopyStatus] = useState("");
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		console.log("handleImageUpload triggered", e.target.files);
		const file = e.target.files?.[0];
		if (!file) {
			console.log("No file selected");
			return;
		}

		console.log("File selected:", file.name, file.type, file.size);
		const reader = new FileReader();
		reader.onload = (event) => {
			console.log("FileReader onload triggered");
			const img = new Image();
			img.crossOrigin = "anonymous";
			img.onload = () => {
				console.log("Image loaded:", img.width, "x", img.height);
				setOriginalImage(img);
			};
			img.onerror = (err) => {
				console.error("Image loading error:", err);
			};
			img.src = event.target?.result as string;
		};
		reader.onerror = (err) => {
			console.error("FileReader error:", err);
		};
		reader.readAsDataURL(file);
		// Reset file input to allow selecting the same file again
		e.target.value = "";
		console.log("File input reset, new value:", e.target.value);
	};

	const applyDithering = useCallback(() => {
		if (!originalImage || !canvasRef.current) return;

		const canvas = canvasRef.current;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// Calculate dimensions while maintaining aspect ratio
		const width = originalImage.width;
		const height = originalImage.height;

		// Set canvas to image dimensions (we'll handle display scaling with CSS)
		canvas.width = width;
		canvas.height = height;

		// Create a temporary canvas for pre-processing
		const tempCanvas = document.createElement("canvas");
		tempCanvas.width = width;
		tempCanvas.height = height;
		const tempCtx = tempCanvas.getContext("2d");
		if (!tempCtx) return;

		// Draw original image with brightness and contrast adjustments
		tempCtx.clearRect(0, 0, width, height);
		tempCtx.drawImage(originalImage, 0, 0, width, height);

		// Apply brightness and contrast
		const imageData = tempCtx.getImageData(0, 0, width, height);
		const data = imageData.data;

		const factor = (259 * (contrast[0] + 255)) / (255 * (259 - contrast[0]));

		for (let i = 0; i < data.length; i += 4) {
			// Apply brightness
			data[i] += brightness[0];
			data[i + 1] += brightness[0];
			data[i + 2] += brightness[0];

			// Apply contrast
			data[i] = factor * (data[i] - 128) + 128;
			data[i + 1] = factor * (data[i + 1] - 128) + 128;
			data[i + 2] = factor * (data[i + 2] - 128) + 128;

			// Convert to grayscale
			const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
			data[i] = data[i + 1] = data[i + 2] = gray;
		}

		tempCtx.putImageData(imageData, 0, 0);

		// Get the pre-processed image data for dithering
		const processedImageData = tempCtx.getImageData(0, 0, width, height);

		// Apply selected dithering method
		switch (ditheringMethod) {
			case "threshold":
				applyThreshold(processedImageData, threshold[0], inverted);
				break;
			case "floydSteinberg":
				applyFloydSteinberg(processedImageData, inverted);
				break;
			case "atkinson":
				applyAtkinson(processedImageData, inverted);
				break;
			case "bayer":
				applyBayer(processedImageData, patternSize[0], inverted);
				break;
			case "random":
				applyRandom(processedImageData, inverted);
				break;
		}

		// Put the processed image data back
		ctx.putImageData(processedImageData, 0, 0);
	}, [
		originalImage,
		ditheringMethod,
		brightness,
		contrast,
		threshold,
		patternSize,
		inverted,
	]);

	const applyThreshold = (
		imageData: ImageData,
		threshold: number,
		inverted: boolean,
	) => {
		const data = imageData.data;
		for (let i = 0; i < data.length; i += 4) {
			const gray = data[i];
			const newValue = gray < threshold ? 0 : 255;
			const finalValue = inverted ? 255 - newValue : newValue;
			data[i] = data[i + 1] = data[i + 2] = finalValue;
		}
	};

	const applyFloydSteinberg = (imageData: ImageData, inverted: boolean) => {
		const width = imageData.width;
		const height = imageData.height;
		const data = imageData.data;
		const grayscale = new Array(width * height);

		// Extract grayscale values
		for (let i = 0; i < data.length; i += 4) {
			grayscale[i / 4] = data[i];
		}

		// Apply Floyd-Steinberg dithering
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const index = y * width + x;
				const oldPixel = grayscale[index];
				const newPixel = oldPixel < 128 ? 0 : 255;
				grayscale[index] = newPixel;
				const error = oldPixel - newPixel;

				if (x + 1 < width) grayscale[index + 1] += (error * 7) / 16;
				if (y + 1 < height && x > 0)
					grayscale[index + width - 1] += (error * 3) / 16;
				if (y + 1 < height) grayscale[index + width] += (error * 5) / 16;
				if (y + 1 < height && x + 1 < width)
					grayscale[index + width + 1] += (error * 1) / 16;
			}
		}

		// Update image data
		for (let i = 0; i < data.length; i += 4) {
			const value = inverted ? 255 - grayscale[i / 4] : grayscale[i / 4];
			data[i] = data[i + 1] = data[i + 2] = value;
		}
	};

	const applyAtkinson = (imageData: ImageData, inverted: boolean) => {
		const width = imageData.width;
		const height = imageData.height;
		const data = imageData.data;
		const grayscale = new Array(width * height);

		// Extract grayscale values
		for (let i = 0; i < data.length; i += 4) {
			grayscale[i / 4] = data[i];
		}

		// Apply Atkinson dithering
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const index = y * width + x;
				const oldPixel = grayscale[index];
				const newPixel = oldPixel < 128 ? 0 : 255;
				grayscale[index] = newPixel;
				const error = Math.floor((oldPixel - newPixel) / 8);

				if (x + 1 < width) grayscale[index + 1] += error;
				if (x + 2 < width) grayscale[index + 2] += error;
				if (y + 1 < height && x - 1 >= 0) grayscale[index + width - 1] += error;
				if (y + 1 < height) grayscale[index + width] += error;
				if (y + 1 < height && x + 1 < width)
					grayscale[index + width + 1] += error;
				if (y + 2 < height) grayscale[index + width * 2] += error;
			}
		}

		// Update image data
		for (let i = 0; i < data.length; i += 4) {
			const value = inverted ? 255 - grayscale[i / 4] : grayscale[i / 4];
			data[i] = data[i + 1] = data[i + 2] = value;
		}
	};

	const applyBayer = (
		imageData: ImageData,
		patternSize: number,
		inverted: boolean,
	) => {
		const width = imageData.width;
		const height = imageData.height;
		const data = imageData.data;

		// Bayer matrices for different sizes
		const bayerMatrix: Record<number, number[][]> = {
			2: [
				[0, 2],
				[3, 1],
			],
			4: [
				[0, 8, 2, 10],
				[12, 4, 14, 6],
				[3, 11, 1, 9],
				[15, 7, 13, 5],
			],
			8: [
				[0, 32, 8, 40, 2, 34, 10, 42],
				[48, 16, 56, 24, 50, 18, 58, 26],
				[12, 44, 4, 36, 14, 46, 6, 38],
				[60, 28, 52, 20, 62, 30, 54, 22],
				[3, 35, 11, 43, 1, 33, 9, 41],
				[51, 19, 59, 27, 49, 17, 57, 25],
				[15, 47, 7, 39, 13, 45, 5, 37],
				[63, 31, 55, 23, 61, 29, 53, 21],
			],
		};

		// Use the closest available matrix size
		const matrixSize = patternSize <= 2 ? 2 : patternSize <= 4 ? 4 : 8;
		const matrix = bayerMatrix[matrixSize];
		const matrixLength = matrix.length;

		// Normalize the matrix values to 0-255 range
		const normalizedMatrix = matrix.map((row) =>
			row.map((val) => Math.floor((val * 255) / (matrixLength * matrixLength))),
		);

		// Apply Bayer dithering
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const index = (y * width + x) * 4;
				const gray = data[index];
				const matrixX = x % matrixLength;
				const matrixY = y % matrixLength;
				const threshold = normalizedMatrix[matrixY][matrixX];
				const newValue = gray < threshold ? 0 : 255;
				const finalValue = inverted ? 255 - newValue : newValue;
				data[index] = data[index + 1] = data[index + 2] = finalValue;
			}
		}
	};

	const applyRandom = (imageData: ImageData, inverted: boolean) => {
		const data = imageData.data;
		for (let i = 0; i < data.length; i += 4) {
			const gray = data[i];
			const randomThreshold = Math.random() * 255;
			const newValue = gray < randomThreshold ? 0 : 255;
			const finalValue = inverted ? 255 - newValue : newValue;
			data[i] = data[i + 1] = data[i + 2] = finalValue;
		}
	};

	// Function to convert canvas to BMP and download
	const downloadAsBMP = () => {
		if (!canvasRef.current) return;

		const canvas = canvasRef.current;
		const width = canvas.width;
		const height = canvas.height;
		const imageData = canvas
			.getContext("2d")
			?.getImageData(0, 0, width, height);

		if (!imageData) return;

		// BMP file header (14 bytes)
		const fileHeaderSize = 14;
		// DIB header (40 bytes for BITMAPINFOHEADER)
		const dibHeaderSize = 40;
		// Each row must be padded to a multiple of 4 bytes
		const rowSize = Math.floor((width * 3 + 3) / 4) * 4;
		const pixelArraySize = rowSize * height;
		const fileSize = fileHeaderSize + dibHeaderSize + pixelArraySize;

		const buffer = new ArrayBuffer(fileSize);
		const view = new DataView(buffer);

		// BMP file header (14 bytes)
		view.setUint8(0, 0x42); // 'B'
		view.setUint8(1, 0x4d); // 'M'
		view.setUint32(2, fileSize, true); // File size
		view.setUint16(6, 0, true); // Reserved
		view.setUint16(8, 0, true); // Reserved
		view.setUint32(10, fileHeaderSize + dibHeaderSize, true); // Offset to pixel array

		// DIB header (40 bytes for BITMAPINFOHEADER)
		view.setUint32(14, dibHeaderSize, true); // DIB header size
		view.setInt32(18, width, true); // Width
		view.setInt32(22, -height, true); // Height (negative for top-down)
		view.setUint16(26, 1, true); // Color planes
		view.setUint16(28, 24, true); // Bits per pixel (24 for RGB)
		view.setUint32(30, 0, true); // No compression
		view.setUint32(34, pixelArraySize, true); // Size of pixel array
		view.setInt32(38, 2835, true); // Horizontal resolution (72 DPI)
		view.setInt32(42, 2835, true); // Vertical resolution (72 DPI)
		view.setUint32(46, 0, true); // Number of colors in palette
		view.setUint32(50, 0, true); // All colors are important

		// Pixel array (bottom-up, padded rows)
		const data = imageData.data;
		let offset = fileHeaderSize + dibHeaderSize;

		for (let y = 0; y < height; y++) {
			let rowOffset = 0;
			for (let x = 0; x < width; x++) {
				const index = (y * width + x) * 4;
				view.setUint8(offset++, data[index + 2]); // Blue
				view.setUint8(offset++, data[index + 1]); // Green
				view.setUint8(offset++, data[index]); // Red
				rowOffset += 3;
			}

			// Pad row to multiple of 4 bytes
			while (rowOffset % 4 !== 0) {
				view.setUint8(offset++, 0);
				rowOffset++;
			}
		}

		// Create blob and download
		const blob = new Blob([buffer], { type: "image/bmp" });
		const link = document.createElement("a");
		link.href = URL.createObjectURL(blob);
		link.download = "dithered-image.bmp";
		link.click();
	};

	// Function to copy canvas as base64
	const copyAsBase64 = async () => {
		if (!canvasRef.current) return;

		try {
			const base64Data = canvasRef.current.toDataURL("image/png");
			await navigator.clipboard.writeText(base64Data);
			setCopyStatus("Copied!");
			setTimeout(() => setCopyStatus(""), 2000);
		} catch (err) {
			console.error("Error when copying base64:", err);
			setCopyStatus("Failed to copy");
			setTimeout(() => setCopyStatus(""), 2000);
		}
	};

	const zoomIn = () => {
		setZoom((prev) => Math.min(prev + 0.25, 5));
	};

	const zoomOut = () => {
		setZoom((prev) => Math.max(prev - 0.25, 0.25));
	};

	const handleFileInputClick = () => {
		console.log("handleFileInputClick function called");
		try {
			if (fileInputRef.current) {
				console.log("fileInputRef exists, calling click()");
				// Reset value before click to ensure onChange fires even with the same file
				fileInputRef.current.value = "";
				fileInputRef.current.click();
			} else {
				console.error("fileInputRef is null");
			}
		} catch (error) {
			console.error("Error when clicking file input:", error);
		}
	};

	// Apply dithering whenever parameters change
	useEffect(() => {
		if (originalImage) {
			applyDithering();
		}
	}, [
		originalImage,
		ditheringMethod,
		brightness,
		contrast,
		threshold,
		patternSize,
		inverted,
		applyDithering,
	]);

	// Debug the file input element
	useEffect(() => {
		if (fileInputRef.current) {
			console.log("File input ref initialized", fileInputRef.current);

			// Add a debugging click handler
			const originalClick = fileInputRef.current.click;
			fileInputRef.current.click = function () {
				console.log("File input click method called");
				return originalClick.apply(this);
			};
		}
	}, []);

	return (
		<div
			ref={containerRef}
			className="w-full rounded-lg border flex flex-col items-center justify-center relative overflow-hidden"
		>
			{/* Always render the file input but keep it hidden */}
			<input
				ref={fileInputRef}
				type="file"
				accept="image/*"
				onChange={handleImageUpload}
				className="hidden"
				onClick={(e) => console.log("File input clicked", e)}
			/>

			{!originalImage ? (
				<div className="flex flex-col items-center justify-center text-center py-16">
					<ImageIcon className="h-16 w-16 mb-4" />
					<p className="text-lg mb-4">Drop an image or click to upload</p>
					<Button onClick={handleFileInputClick} variant="secondary" size="lg">
						<Upload className="h-4 w-4 mr-2" />
						Upload Image
					</Button>
				</div>
			) : (
				<div className="w-full flex flex-col md:flex-row">
					<div
						className="relative overflow-auto w-full md:w-3/4 h-[400px] md:h-[600px] flex items-center justify-center"
						onClick={() => setShowControls(!showControls)}
					>
						<canvas
							ref={canvasRef}
							style={{
								transform: `scale(${zoom})`,
								transition: "transform 0.2s ease-out",
								imageRendering: "pixelated",
							}}
							className="max-w-none ring-1 ring-green-500"
						/>
					</div>

					{/* Controls panel */}
					<div className="w-full md:w-1/4 border-t md:border-t-0 md:border-l p-4">
						<div className="space-y-4">
							<div className="flex justify-between items-center">
								<h3 className="font-bold flex items-center">
									<Sliders className="h-4 w-4 mr-2" />
									Dithering Controls
								</h3>
								<div className="flex space-x-2">
									<Button variant="secondary" size="icon" onClick={zoomOut}>
										<ZoomOut className="h-4 w-4" />
									</Button>
									<Button variant="secondary" size="icon" onClick={zoomIn}>
										<ZoomIn className="h-4 w-4" />
									</Button>
								</div>
							</div>

							<div className="space-y-2">
								<label className="text-xs font-medium">Dithering Method</label>
								<Select
									value={ditheringMethod}
									onValueChange={setDitheringMethod}
								>
									<SelectTrigger className="h-8 text-sm">
										<SelectValue placeholder="Select dithering method" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="threshold">Simple Threshold</SelectItem>
										<SelectItem value="floydSteinberg">
											Floyd-Steinberg
										</SelectItem>
										<SelectItem value="atkinson">Atkinson</SelectItem>
										<SelectItem value="bayer">Ordered (Bayer)</SelectItem>
										<SelectItem value="random">Random</SelectItem>
									</SelectContent>
								</Select>
							</div>

							{ditheringMethod === "threshold" && (
								<div className="space-y-1">
									<label className="text-xs font-medium">
										Threshold ({threshold[0]})
									</label>
									<Slider
										value={threshold}
										min={0}
										max={255}
										step={1}
										onValueChange={setThreshold}
										className="h-4"
									/>
								</div>
							)}

							{ditheringMethod === "bayer" && (
								<div className="space-y-1">
									<label className="text-xs font-medium">
										Pattern Size ({patternSize[0]}x{patternSize[0]})
									</label>
									<Slider
										value={patternSize}
										min={2}
										max={8}
										step={2}
										onValueChange={setPatternSize}
										className="h-4"
									/>
								</div>
							)}

							<div className="space-y-1">
								<label className="text-xs font-medium">
									Brightness ({brightness[0]})
								</label>
								<Slider
									value={brightness}
									min={-200}
									max={200}
									step={1}
									onValueChange={setBrightness}
									className="h-4"
								/>
							</div>

							<div className="space-y-1">
								<label className="text-xs font-medium">
									Contrast ({contrast[0]})
								</label>
								<Slider
									value={contrast}
									min={-100}
									max={100}
									step={1}
									onValueChange={setContrast}
									className="h-4"
								/>
							</div>

							<div className="flex items-center space-x-2">
								<input
									type="checkbox"
									id="invert"
									checked={inverted}
									onChange={(e) => setInverted(e.target.checked)}
									className="rounded"
								/>
								<label htmlFor="invert" className="text-xs font-medium">
									Invert Colors
								</label>
							</div>

							<div className="grid grid-cols-1 gap-2 pt-2">
								<Button
									size="sm"
									variant="secondary"
									onClick={handleFileInputClick}
								>
									<Upload className="h-3 w-3 mr-1" />
									Select New Image
								</Button>

								<Button size="sm" variant="secondary" onClick={copyAsBase64}>
									<Copy className="h-3 w-3 mr-1" />
									Copy as Base64
									{copyStatus && (
										<span className="ml-1 text-xs">{copyStatus}</span>
									)}
								</Button>

								<Button size="sm" variant="default" onClick={downloadAsBMP}>
									<Download className="h-3 w-3 mr-1" />
									Download as BMP
								</Button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

declare module "qrcode-generator" {
	type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";

	type QrCode = {
		addData(data: string): void;
		make(): void;
		getModuleCount(): number;
		isDark(row: number, col: number): boolean;
	};

	export default function qrcode(
		typeNumber: number,
		errorCorrectionLevel: ErrorCorrectionLevel,
	): QrCode;
}

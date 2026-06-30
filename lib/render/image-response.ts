export type RenderedImageResponse = {
	buffer: Buffer;
	mime_type: string;
	size_limit_exceeded?: boolean;
};

export function imageResponse(
	image: RenderedImageResponse,
	status = 200,
): Response {
	return new Response(new Uint8Array(image.buffer), {
		status,
		headers: {
			"Content-Type": image.mime_type,
			"Content-Length": image.buffer.length.toString(),
			...(image.size_limit_exceeded
				? { "X-TRMNL-Image-Size-Limit-Exceeded": "true" }
				: {}),
		},
	});
}

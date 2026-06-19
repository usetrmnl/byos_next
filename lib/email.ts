/**
 * Email sending utility for Better Auth
 *
 * NOTE: This is a placeholder implementation that logs emails to the console.
 * In production, you should replace this with a real email service like:
 * - Resend
 * - SendGrid
 * - AWS SES
 * - Postmark
 * - Nodemailer with SMTP
 */

interface SendEmailOptions {
	to: string;
	subject: string;
	text?: string;
	html?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
	const resendApiKey = process.env.RESEND_API_KEY;
	const from = process.env.EMAIL_FROM;

	if (resendApiKey && from) {
		const response = await fetch("https://api.resend.com/emails", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${resendApiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				from,
				to: options.to,
				subject: options.subject,
				text: options.text,
				html: options.html,
			}),
		});
		if (!response.ok) {
			throw new Error(`Resend email failed with status ${response.status}`);
		}
		return;
	}

	if (process.env.NODE_ENV === "production") {
		throw new Error("Email provider is not configured");
	}

	console.log("Email would be sent:");
	console.log("To:", options.to);
	console.log("Subject:", options.subject);
	console.log("Content:", options.text || options.html);
	console.log("---");
}

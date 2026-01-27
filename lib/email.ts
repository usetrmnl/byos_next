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
	// Log to console for development
	console.log("📧 Email would be sent:");
	console.log("To:", options.to);
	console.log("Subject:", options.subject);
	console.log("Content:", options.text || options.html);
	console.log("---");

	// TODO: Replace with actual email service
	// Example with Resend:
	// import { Resend } from 'resend';
	// const resend = new Resend(process.env.RESEND_API_KEY);
	// await resend.emails.send({
	//   from: 'noreply@yourdomain.com',
	//   to: options.to,
	//   subject: options.subject,
	//   text: options.text,
	//   html: options.html,
	// });

	// For development, we'll just simulate success
	return Promise.resolve();
}

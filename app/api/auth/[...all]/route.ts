import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";

const disabledHandler = () =>
	NextResponse.json({ error: "Auth disabled" }, { status: 404 });

const handler = auth ? toNextJsHandler(auth) : null;

export const GET = handler?.GET ?? disabledHandler;
export const POST = handler?.POST ?? disabledHandler;

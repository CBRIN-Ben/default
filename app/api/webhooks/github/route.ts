import { NextResponse } from "next/server";
import {
  postGitHubEventToSlack,
  verifyGitHubWebhookSignature,
} from "@/lib/github/webhook";

export async function POST(request: Request) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!secret) {
    return new Response("GITHUB_WEBHOOK_SECRET is not configured", {
      status: 500,
    });
  }

  const payload = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  const event = request.headers.get("x-github-event");

  if (!event) {
    return new Response("Missing GitHub event header", { status: 400 });
  }

  if (!verifyGitHubWebhookSignature(payload, signature, secret)) {
    return new Response("Invalid signature", { status: 401 });
  }

  const body = JSON.parse(payload) as Record<string, unknown>;

  if (event === "ping") {
    return NextResponse.json({ ok: true, message: "pong" });
  }

  const result = await postGitHubEventToSlack(
    event,
    body as Parameters<typeof postGitHubEventToSlack>[1],
  );

  return NextResponse.json({ ok: true, ...result });
}

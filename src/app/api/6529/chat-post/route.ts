import { createChatPostingCapabilityPayload, postChatMessage } from "@/lib/6529/chat-post";
import { handleRouteError, json, readJsonObject } from "@/lib/api";
import { requireAdminRequest } from "@/lib/admin-auth";
import { chatPostPaceIdentity, directChatPostPace } from "@/lib/chat-posting-policy";
import { recordProjectChatObservation } from "@/lib/command-wave-store";
import { assertRateLimit, assertRateLimitForKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  try {
    assertRateLimit(request, { namespace: "6529_chat_post_capability", max: 30, windowMs: 60_000 });

    return json(createChatPostingCapabilityPayload());
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    requireAdminRequest(request);
    assertRateLimit(request, { namespace: "6529_chat_post", max: 10, windowMs: 60_000 });
    const body = await readJsonObject(request);

    assertRateLimitForKey(chatPostPaceIdentity(body), {
      namespace: "6529_chat_post_builder",
      max: directChatPostPace.maxPosts,
      windowMs: directChatPostPace.windowMs,
    });

    const post = await postChatMessage(body);

    await recordProjectChatObservation(body);

    return json({ post });
  } catch (error) {
    return handleRouteError(error);
  }
}

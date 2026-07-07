import { postChatMessage } from "@/lib/6529/chat-post";
import { handleRouteError, json, readJsonObject } from "@/lib/api";
import { requireAdminRequest } from "@/lib/admin-auth";
import { assertRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    requireAdminRequest(request);
    assertRateLimit(request, { namespace: "6529_chat_post", max: 10, windowMs: 60_000 });

    return json({
      post: await postChatMessage(await readJsonObject(request)),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

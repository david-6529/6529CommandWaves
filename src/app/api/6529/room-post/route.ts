import { POST as postChatMessage } from "../chat-post/route";

const canonicalChatPostRoute = "/api/6529/chat-post";

function withLegacyRouteHeaders(response: Response) {
  response.headers.set("Deprecation", "true");
  response.headers.set("Link", `<${canonicalChatPostRoute}>; rel="successor-version"`);
  response.headers.set("X-Command-Waves-Canonical-Route", canonicalChatPostRoute);

  return response;
}

export async function POST(request: Request) {
  return withLegacyRouteHeaders(await postChatMessage(request));
}

import { handleRouteError, json } from "@/lib/api";
import { requireAdminRequest } from "@/lib/admin-auth";
import { postRoomMessage } from "@/lib/6529/room-post";

export async function POST(request: Request) {
  try {
    requireAdminRequest(request);

    return json({
      post: await postRoomMessage(await request.json()),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

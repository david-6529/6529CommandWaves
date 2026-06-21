import { handleRouteError, json } from "@/lib/api";
import { previewWaveContext } from "@/lib/6529/wave-context";

export async function POST(request: Request) {
  try {
    return json({
      preview: await previewWaveContext(await request.json()),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

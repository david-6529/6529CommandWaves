import { normalizeWaveDropsResponse } from "./normalize";
import type { DropPollRequest, PostDropOptions } from "./types";

const mockDropsFixture = {
  wave: {
    id: "mock-command-wave",
    name: "Mock Command Wave",
    total_drops_count: 3,
  },
  drops: [
    {
      id: "drop-003",
      serial_no: 3,
      created_at: "2026-06-20T12:10:00.000Z",
      content: "Reviewer passed cmd-001. The PR matched the approved command.",
      author: { handle: "reviewer-agent" },
      drop_type: "CHAT",
    },
    {
      id: "drop-002",
      serial_no: 2,
      created_at: "2026-06-20T12:05:00.000Z",
      content: "Poll passed for cmd-001 with quorum met.",
      author: { handle: "wave-poll" },
      drop_type: "CHAT",
    },
    {
      id: "drop-001",
      serial_no: 1,
      created_at: "2026-06-20T12:00:00.000Z",
      content: "Proposal cmd-001: add the Command Waves landing page copy.",
      author: { handle: "david" },
      drop_type: "CHAT",
    },
  ],
};

export function is6529MockMode() {
  return process.env["6529_MOCK_MODE"] !== "false";
}

export function getMockWave(waveId: string) {
  return {
    id: waveId,
    name: "Mock Command Wave",
    source: "fixture",
  };
}

export function getMockWaveDrops(waveId: string) {
  return normalizeWaveDropsResponse({
    ...mockDropsFixture,
    wave: {
      ...mockDropsFixture.wave,
      id: waveId,
    },
  });
}

export function getMockPostDrop(waveId: string, content: string, options: PostDropOptions = {}) {
  return {
    id: `mock-post-${Date.now()}`,
    wave_id: waveId,
    content,
    drop_type: options.dropType ?? (options.poll ? "PARTICIPATORY" : "CHAT"),
    reply_to_drop_id: options.replyToDropId ?? null,
    poll: options.poll ?? null,
    source: "fixture",
  };
}

export function getMockPollDrop(
  waveId: string,
  content: string,
  poll: DropPollRequest,
  options: Omit<PostDropOptions, "poll" | "dropType"> = {},
) {
  return getMockPostDrop(waveId, content, {
    ...options,
    poll,
    dropType: "PARTICIPATORY",
  });
}

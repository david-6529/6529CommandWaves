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
      content: "Repo placeholder for now. Which GitHub repo should hold the hook before PR work starts?",
      author: { handle: "daemon" },
      drop_type: "CHAT",
    },
    {
      id: "drop-002",
      serial_no: 2,
      created_at: "2026-06-20T12:05:00.000Z",
      content: "Project decision passed for cmd-001 with quorum met.",
      author: { handle: "wave-poll" },
      drop_type: "CHAT",
    },
    {
      id: "drop-001",
      serial_no: 1,
      created_at: "2026-06-20T12:00:00.000Z",
      content: "Proposal cmd-001: draft the non-upgradeable AMM hook scaffold.",
      author: { handle: "david" },
      drop_type: "CHAT",
    },
  ],
};
const mockPostBaseMs = Date.parse("2026-06-20T12:10:00.000Z");
const mockPostedDrops = new Map<string, unknown[]>();
let mockPostSerial = 4;

export function is6529MockMode() {
  return process.env["6529_MOCK_MODE"] !== "false";
}

export function getMockWave(waveId: string) {
  return {
    id: waveId,
    name: "Mock Command Wave",
    total_drops_count: mockDropsFixture.drops.length + (mockPostedDrops.get(waveId)?.length ?? 0),
    source: "fixture",
  };
}

export function getMockWaveDrops(waveId: string) {
  const postedDrops = mockPostedDrops.get(waveId) ?? [];

  return normalizeWaveDropsResponse({
    ...mockDropsFixture,
    wave: {
      ...mockDropsFixture.wave,
      id: waveId,
      total_drops_count: mockDropsFixture.drops.length + postedDrops.length,
    },
    drops: [...postedDrops].reverse().concat(mockDropsFixture.drops),
  });
}

export function getMockPostDrop(waveId: string, content: string, options: PostDropOptions = {}) {
  const serial = mockPostSerial;
  const drop = {
    id: `mock-post-${serial}`,
    wave_id: waveId,
    serial_no: serial,
    created_at: new Date(mockPostBaseMs + (serial - 3) * 60_000).toISOString(),
    content,
    author: { handle: "chat-builder" },
    drop_type: options.dropType ?? (options.poll ? "PARTICIPATORY" : "CHAT"),
    reply_to_drop_id: options.replyToDropId ?? null,
    poll: options.poll ?? null,
    source: "fixture",
  };

  mockPostSerial += 1;
  mockPostedDrops.set(waveId, [...(mockPostedDrops.get(waveId) ?? []), drop]);

  return drop;
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

export function resetMockDropsForTests() {
  mockPostedDrops.clear();
  mockPostSerial = 4;
}

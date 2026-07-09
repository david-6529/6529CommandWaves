"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { ChatPostingCapability } from "@/lib/6529/chat-post";
import type { WorkspaceDiscussionMessage } from "@/lib/project-workspace-view";
import { siteCopy } from "@/lib/site-copy";
import { useWalletIdentity } from "./wallet-identity";

type DiscussionTab = "all" | "design" | "reviews";

const tabs: Array<{ id: DiscussionTab; label: string }> = [
  { id: "all", label: "All" },
  { id: "design", label: "Design" },
  { id: "reviews", label: "Reviews" },
];

function messageTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");

  return `${hours}:${minutes} UTC`;
}

function shortAddress(address: string) {
  return address.length > 12 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;
}

function postError(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return "Message could not be sent.";
  }

  const record = payload as Record<string, unknown>;
  const error = record.error;

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (error && typeof error === "object" && !Array.isArray(error)) {
    const message = (error as Record<string, unknown>).message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return "Message could not be sent.";
}

export function ProjectDiscussion({
  waveUrl,
  summary,
  initialMessages,
  capability,
  sourceReady,
}: {
  waveUrl: string;
  summary: string;
  initialMessages: WorkspaceDiscussionMessage[];
  capability: ChatPostingCapability;
  sourceReady: boolean;
}) {
  const wallet = useWalletIdentity();
  const [activeTab, setActiveTab] = useState<DiscussionTab>("all");
  const [messages, setMessages] = useState(initialMessages);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const visibleMessages = useMemo(
    () => messages.filter((message) => activeTab === "all" || message.channel === activeTab),
    [activeTab, messages],
  );
  const localPosting = capability.canPost && capability.mode === "mock";
  const canSend = localPosting && Boolean(wallet.address) && Boolean(content.trim()) && !busy;

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = siteCopy(content.trim());

    if (!message || !wallet.address || !localPosting) {
      return;
    }

    setBusy(true);
    setNotice("");

    try {
      const response = await fetch("/api/6529/chat-post", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          waveUrl,
          content: message,
          walletAddress: wallet.address,
          senderId: wallet.address,
        }),
      });
      const payload = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(postError(payload));
      }

      const now = new Date().toISOString();

      setMessages((current) => [
        ...current,
        {
          id: `local-${now}`,
          author: shortAddress(wallet.address),
          body: message,
          at: now,
          channel: "all",
        },
      ]);
      setContent("");
      setNotice("Message added to the local project preview.");
      setActiveTab("all");
    } catch (error) {
      setNotice(siteCopy(error instanceof Error ? error.message : "Message could not be sent."));
    } finally {
      setBusy(false);
    }
  }

  const postingNote = !wallet.address
    ? "Connect a wallet to message the local preview."
    : localPosting
      ? "Local preview only. Signed member posting is not live yet."
      : "Signed member posting is not live yet. Read the discussion here or open the original source.";

  return (
    <section id="discussion" className="scroll-mt-6 overflow-hidden rounded-md border border-zinc-800 bg-[#0c0c0d]" aria-labelledby="discussion-title">
      <header className="border-b border-zinc-800 px-5 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-cyan-300">Live discussion</p>
            <h2 id="discussion-title" className="mt-2 text-2xl font-semibold text-zinc-50">
              Build together
            </h2>
          </div>
          {sourceReady ? (
            <a
              href={waveUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-zinc-400 underline decoration-zinc-700 underline-offset-4 transition hover:text-zinc-100"
            >
              Original discussion
            </a>
          ) : (
            <span className="text-sm text-zinc-600">Source not connected</span>
          )}
        </div>

        <div className="mt-5 flex gap-1 border-b border-zinc-800" role="tablist" aria-label="Discussion filters">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`min-h-10 border-b-2 px-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
                activeTab === tab.id
                  ? "border-cyan-300 text-zinc-50"
                  : "border-transparent text-zinc-500 hover:text-zinc-200"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div className="border-b border-cyan-950 bg-cyan-950/20 px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-cyan-300 font-mono text-[10px] font-bold text-zinc-950">
            D
          </span>
          <div>
            <p className="text-sm font-semibold text-cyan-100">daemon summary</p>
            <p className="mt-1 text-sm leading-6 text-cyan-50/70">{summary}</p>
          </div>
        </div>
      </div>

      <div
        className="max-h-[34rem] min-h-72 overflow-y-auto"
        aria-label="Builder discussion"
        aria-live="polite"
      >
        {visibleMessages.length ? (
          <ol className="divide-y divide-zinc-900">
            {visibleMessages.map((message) => (
              <li key={message.id} className="px-5 py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 truncate text-sm font-semibold text-zinc-200">{message.author}</p>
                  <time className="shrink-0 font-mono text-xs text-zinc-600" dateTime={message.at}>
                    {messageTime(message.at)}
                  </time>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-[15px] leading-6 text-zinc-400">{message.body}</p>
              </li>
            ))}
          </ol>
        ) : (
          <div className="flex min-h-72 items-center px-5 py-10">
            <div>
              <p className="text-base font-semibold text-zinc-200">No live builder messages yet</p>
              <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
                The first real discussion will appear here. Normal messages can become work drafts, decisions, or review requests after daemon parses them.
              </p>
            </div>
          </div>
        )}
      </div>

      <form className="border-t border-zinc-800 px-5 py-5" onSubmit={sendMessage}>
        <label htmlFor="project-message" className="text-sm font-semibold text-zinc-200">
          Message the builders
        </label>
        <textarea
          id="project-message"
          value={content}
          maxLength={4000}
          rows={3}
          placeholder="Share an idea, question, PR, or review note."
          className="mt-3 w-full resize-y rounded-md border border-zinc-700 bg-black px-3 py-3 text-base leading-6 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
          onChange={(event) => setContent(event.target.value)}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-md text-xs leading-5 text-zinc-500">{postingNote}</p>
          <button
            type="submit"
            disabled={!canSend}
            className="min-h-11 rounded-md bg-cyan-300 px-5 text-sm font-bold text-zinc-950 transition hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600"
          >
            {busy ? "Sending" : "Send"}
          </button>
        </div>
        {notice ? (
          <p className="mt-3 text-sm leading-6 text-zinc-400" aria-live="polite">
            {notice}
          </p>
        ) : null}
      </form>
    </section>
  );
}

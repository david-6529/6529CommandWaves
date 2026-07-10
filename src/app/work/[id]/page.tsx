import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { WorkItemPage } from "@/components/work-item-page";
import { WalletIdentityProvider } from "@/components/wallet-identity";
import { getCommandWave } from "@/lib/command-wave-store";
import { getCurrentWalletSession } from "@/lib/current-wallet-session";
import { isProjectPreviewMode } from "@/lib/project-runtime";
import { createProjectWorkspaceView, findWorkspaceWorkItem } from "@/lib/project-workspace-view";

export const metadata: Metadata = {
  title: "Work | Decentralized Coding: Beta",
  description: "Scope, decisions, code status, roles, and evidence for one public build item.",
};

export default async function WorkPage(props: PageProps<"/work/[id]">) {
  await connection();

  const [{ id }, wave, walletSession] = await Promise.all([
    props.params,
    getCommandWave(),
    getCurrentWalletSession(),
  ]);
  const view = createProjectWorkspaceView(wave, { previewMode: isProjectPreviewMode() });
  const item = findWorkspaceWorkItem(view, id);

  if (!item) {
    notFound();
  }

  return (
    <WalletIdentityProvider initialSession={walletSession}>
      <WorkItemPage view={view} item={item} />
    </WalletIdentityProvider>
  );
}

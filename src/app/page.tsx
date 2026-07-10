import { connection } from "next/server";
import { ProjectWorkspace } from "@/components/project-workspace";
import { WalletIdentityProvider } from "@/components/wallet-identity";
import { getChatPostingCapability } from "@/lib/6529/chat-post";
import { getCommandWave } from "@/lib/command-wave-store";
import { getCurrentWalletSession } from "@/lib/current-wallet-session";
import { isProjectPreviewMode } from "@/lib/project-runtime";
import { createProjectWorkspaceView } from "@/lib/project-workspace-view";

export default async function Home() {
  await connection();

  const [wave, walletSession] = await Promise.all([getCommandWave(), getCurrentWalletSession()]);
  const previewMode = isProjectPreviewMode();
  const view = createProjectWorkspaceView(wave, { previewMode });
  const chatCapability = getChatPostingCapability();

  return (
    <WalletIdentityProvider initialSession={walletSession}>
      <ProjectWorkspace view={view} chatCapability={chatCapability} />
    </WalletIdentityProvider>
  );
}

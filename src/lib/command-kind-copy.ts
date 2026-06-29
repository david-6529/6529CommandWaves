import type { CommandKind } from "./command-waves";

const commandKindLabels: Record<CommandKind, string> = {
  read_context: "Read context",
  draft_response: "Draft response",
  post_to_wave: "Wave update",
  open_pr: "Open PR",
  run_script: "Run script",
  deploy: "Deploy",
  spend_money: "Spend money",
  change_rules: "Change rules",
};

export function commandKindLabel(kind: CommandKind) {
  return commandKindLabels[kind];
}

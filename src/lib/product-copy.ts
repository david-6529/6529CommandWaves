export const commandWaveProductCopy = {
  eyebrow: "6529 Hook Builder",
  headline: "Build the 6529 hook in public.",
  subhead:
    "One builder wave governs one smart contract repo. Members propose scoped work, decisions approve PRs, agents help, and reviewers check every change.",
  simpleFlow: "Choose project - Propose work - Decide - Build PR - Review",
  steps: [
    {
      step: "Step 1",
      title: "Choose the project",
      body: "Pick the builder wave and GitHub repo for the hook project.",
    },
    {
      step: "Step 2",
      title: "Approve scoped work",
      body: "Turn ideas into clear PR-sized commands with limits and review criteria.",
    },
    {
      step: "Step 3",
      title: "Build and review",
      body: "Agents can help open PRs, but humans keep control of merges and deploys.",
    },
  ],
} as const;

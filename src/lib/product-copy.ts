export const commandWaveProductCopy = {
  eyebrow: "6529 Command Waves",
  headline: "Let a wave control an AI worker.",
  subhead:
    "Connect a 6529 wave to a repo. People propose commands. Simple rules decide what can run now and what needs a vote first.",
  simpleFlow: "Propose - Vote if risky - Run - Review",
  steps: [
    {
      step: "Step 1",
      title: "Choose the wave",
      body: "Pick the 6529 wave and GitHub repo this AI worker is allowed to help with.",
    },
    {
      step: "Step 2",
      title: "Propose work",
      body: "Write the command in plain English. The app checks the risk before anything runs.",
    },
    {
      step: "Step 3",
      title: "Run and review",
      body: "Approved work is executed, reviewed, and logged so the wave can see what happened.",
    },
  ],
} as const;

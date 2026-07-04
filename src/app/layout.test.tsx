import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RootLayout from "./layout";

describe("RootLayout", () => {
  it("forces the app shell to dark mode", () => {
    const html = renderToStaticMarkup(
      <RootLayout>
        <main>Project room</main>
      </RootLayout>,
    );

    expect(html).toContain('class="dark dark-app h-full bg-zinc-950 text-zinc-100 antialiased"');
    expect(html).toContain('class="dark-app flex min-h-full flex-col bg-zinc-950 text-zinc-100"');
  });
});

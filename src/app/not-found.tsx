import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center bg-[#080809] px-5 text-zinc-100">
      <div className="mx-auto w-full max-w-xl border-y border-zinc-800 py-10">
        <p className="text-xs font-semibold uppercase text-zinc-600">Decentralized Coding: Beta</p>
        <h1 className="mt-4 text-3xl font-semibold text-zinc-50">Work not found</h1>
        <p className="mt-3 text-base leading-7 text-zinc-500">
          This work item does not exist or is no longer visible in the current project.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center rounded-md bg-cyan-300 px-5 text-sm font-bold text-zinc-950 transition hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
        >
          Return to project
        </Link>
      </div>
    </main>
  );
}

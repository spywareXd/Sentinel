"use client";

export default function ActivityHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-[color:color-mix(in_srgb,var(--background)_80%,transparent)] px-8 backdrop-blur-xl">
      <div>
        <h2 className="font-headline text-lg font-black uppercase tracking-tight text-[var(--on-surface)]">
          Account Activity
        </h2>
        <p className="text-xs text-[var(--on-surface-variant)]">
          Punishment history and active account restrictions.
        </p>
      </div>
    </header>
  );
}

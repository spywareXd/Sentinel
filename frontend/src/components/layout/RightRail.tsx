import {
  previousCasesItems,
  roomDetails,
  roomMembers,
} from "@/mockdata/room";
import ProfileLogo from "@/components/ui/ProfileLogo";

export default function RightRail() {
  return (
    <aside className="flex w-72 flex-col bg-[var(--surface-container)]">
      <div className="px-6 py-5">
        <h2 className="font-headline text-sm font-bold text-[var(--on-surface)]">
          {roomDetails.heading}
        </h2>
      </div>

      <div className="premium-scrollbar flex-1 space-y-6 overflow-y-auto px-6 pb-6">
        <div className="rounded-[1.25rem] bg-[var(--surface-container-high)] p-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--on-surface-variant)]">
            About
          </p>
          <p className="text-xs leading-6 text-[var(--on-surface)]">
            {roomDetails.description}
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--on-surface-variant)]">
            {roomDetails.membersLabel}
          </p>

          <div className="space-y-3">
            {roomMembers.map((member) => (
              <div key={member.name} className="flex items-center gap-3">
                <div className="relative">
                  <ProfileLogo
                    name={member.name}
                    initials={member.initials}
                    logoUrl={member.logoUrl}
                    className="h-8 w-8 rounded-lg object-cover"
                    fallbackClassName="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-container-high)] text-xs font-bold text-[var(--on-surface)]"
                  />
                  <span
                    className={[
                      "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--surface-container)]",
                      member.status === "online"
                        ? "bg-emerald-400"
                        : member.status === "offline"
                          ? "bg-[var(--tertiary-container)]"
                          : "bg-[var(--surface-container-highest)]",
                    ].join(" ")}
                  />
                </div>

                <div>
                  <p className="text-xs font-bold text-[var(--on-surface)]">
                    {member.name}
                  </p>
                  <p className="text-[10px] text-[var(--on-surface-variant)]">
                    {member.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--on-surface-variant)]">
            {roomDetails.contextLabel}
          </p>

          {previousCasesItems.map((item) => (
            <div key={item.title} className="rounded-xl bg-[var(--surface-container-low)] p-3">
              <p className="text-[11px] font-bold text-[var(--on-surface)]">
                {item.title}
              </p>
              <p className="mt-1 text-[10px] text-[var(--on-surface-variant)]">
                {item.subtitle}
              </p>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

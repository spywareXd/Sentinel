"use client";

import ProfileLogo from "@/components/ui/ProfileLogo";
import type { RoomDetails, RoomMember } from "@/types/mockdata/room";

type RightRailProps = {
  roomDetails: RoomDetails;
  roomMembers: RoomMember[];
};

export default function RightRail({
  roomDetails,
  roomMembers,
}: RightRailProps) {
  return (
    <aside className="flex w-72 shrink-0 min-h-0 flex-col overflow-hidden bg-[var(--surface-container-low)]">
      <div id="room-details-top" className="shrink-0 px-6 py-5">
        <h2 className="font-headline text-sm font-bold text-[var(--on-surface)]">
          {roomDetails.heading}
        </h2>
      </div>

      <div className="premium-scrollbar flex-1 space-y-6 overflow-y-auto px-6 pb-6">
        <div
          id="room-about"
          className="scroll-mt-6 rounded-[1.25rem] bg-[var(--surface-container-high)] p-4"
        >
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--on-surface-variant)]">
            About
          </p>
          <p className="text-xs leading-6 text-[var(--on-surface)]">
            {roomDetails.description}
          </p>
        </div>

        <div id="room-participants" className="scroll-mt-6 space-y-4">
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
                      "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--surface-container-low)]",
                      member.status === "online"
                        ? "bg-emerald-400"
                        : "bg-[var(--tertiary-container)]",
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
      </div>
    </aside>
  );
}

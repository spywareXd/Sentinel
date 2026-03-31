import { feedMeta, messages } from "@/mockdata/chat";
import ProfileLogo from "@/components/ui/ProfileLogo";

const toneClassMap = {
  primary: "text-[var(--primary)]",
  secondary: "text-[var(--secondary)]",
  tertiary: "text-[var(--tertiary)]",
  self: "text-[var(--on-surface)]",
};

export default function ChatFeed() {
  return (
    <section className="premium-scrollbar flex min-w-0 min-h-0 flex-1 flex-col overflow-y-auto px-6 py-6">
      <div className="flex min-h-full flex-col ">
        <div className="mb-6 flex items-center gap-4 py-4">
          <div className="h-px flex-1 bg-[color:color-mix(in_srgb,var(--outline-variant)_20%,transparent)]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[color:color-mix(in_srgb,var(--on-surface-variant)_70%,transparent)]">
            {feedMeta.dayLabel}
          </span>
          <div className="h-px flex-1 bg-[color:color-mix(in_srgb,var(--outline-variant)_20%,transparent)]" />
        </div>

        <div className="space-y-4">
          {messages.map((message) => {
            const isSelf = message.tone === "self";

            return (
              <div
                key={message.id}
                className={[
                  "flex gap-4",
                  isSelf ? "flex-row-reverse" : "",
                  message.grouped ? "ml-14" : "",
                ].join(" ")}
              >
                {!message.grouped && (
                  <ProfileLogo
                    name={message.author}
                    initials={message.authorInitials}
                    logoUrl={message.authorLogoUrl}
                    className="h-10 w-10 shrink-0 rounded-xl object-cover"
                    fallbackClassName={[
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
                      isSelf
                        ? "bg-[color:color-mix(in_srgb,var(--primary)_15%,transparent)] text-[var(--primary)]"
                        : "bg-[var(--surface-container-high)] text-[var(--on-surface)]",
                    ].join(" ")}
                  />
                )}

                <div
                  className={[
                    "flex flex-col gap-1",
                    isSelf ? "items-end" : "",
                  ].join(" ")}
                >
                  {!message.grouped && (
                    <div className="flex items-baseline gap-2">
                      <span
                        className={[
                          "text-sm font-bold",
                          toneClassMap[message.tone],
                        ].join(" ")}
                      >
                        {message.author}
                      </span>
                      <span className="text-[10px] text-[var(--on-surface-variant)]">
                        {message.time}
                      </span>
                    </div>
                  )}

                  <div
                    className={[
                      "max-w-2xl rounded-xl p-4 text-sm leading-7 shadow-sm",
                      isSelf
                        ? "rounded-tr-sm bg-[color:color-mix(in_srgb,var(--primary)_16%,transparent)] text-[var(--on-surface)]"
                        : "rounded-tl-sm bg-[var(--bubble-bg)] text-[var(--on-surface)]",
                    ].join(" ")}
                  >
                    {message.text}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

type CaseNotesListProps = {
  notes: string[];
};

export default function CaseNotesList({ notes }: CaseNotesListProps) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--on-surface-variant)]">
        Notes
      </p>
      {notes.map((note) => (
        <div
          key={note}
          className="rounded-xl bg-[var(--surface-container-low)] px-4 py-3 text-sm text-[var(--on-surface)]"
        >
          {note}
        </div>
      ))}
    </div>
  );
}

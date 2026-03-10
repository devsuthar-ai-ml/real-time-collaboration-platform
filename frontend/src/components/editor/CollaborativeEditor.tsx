import type { CursorEventPayload } from '../../types';

interface CollaborativeEditorProps {
  value: string;
  isEditable: boolean;
  remoteCursors: Record<string, CursorEventPayload>;
  onChange: (nextValue: string) => void;
  onCursorMove: (position: number, selectionStart?: number, selectionEnd?: number) => void;
}

export const CollaborativeEditor = ({
  value,
  isEditable,
  remoteCursors,
  onChange,
  onCursorMove
}: CollaborativeEditorProps) => {
  return (
    <section className="rounded-2xl border border-brand-100 bg-white p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-brand-900">Live Editor</h2>
        {!isEditable ? (
          <span className="rounded bg-brand-100 px-2 py-1 text-xs font-semibold text-brand-700">
            Read Only
          </span>
        ) : null}
      </div>

      <textarea
        className="h-[420px] w-full resize-none rounded-xl border border-brand-200 bg-brand-50/40 p-4 text-sm leading-6 text-brand-900 outline-none ring-brand-300 transition focus:ring-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onClick={(event) => {
          const target = event.currentTarget;
          onCursorMove(target.selectionStart ?? 0, target.selectionStart ?? 0, target.selectionEnd ?? 0);
        }}
        onKeyUp={(event) => {
          const target = event.currentTarget;
          onCursorMove(target.selectionStart ?? 0, target.selectionStart ?? 0, target.selectionEnd ?? 0);
        }}
        placeholder="Start collaborating in real time..."
        readOnly={!isEditable}
      />

      <div className="mt-4 rounded-xl bg-brand-900 p-3 text-xs text-white">
        <p className="mb-2 font-semibold tracking-wide">Active Collaborator Cursors</p>
        <div className="flex flex-wrap gap-2">
          {Object.values(remoteCursors).length === 0 ? (
            <p className="text-brand-100">No active collaborator cursor updates yet.</p>
          ) : (
            Object.values(remoteCursors).map((cursor) => (
              <span key={cursor.user.id} className="rounded bg-white/15 px-2 py-1">
                {cursor.user.name}: {cursor.position}
              </span>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

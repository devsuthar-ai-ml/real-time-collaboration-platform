import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { documentService } from '../services/document.service';
import type { DocumentEntity } from '../types';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentEntity[]>([]);
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    try {
      const nextDocuments = await documentService.list();
      setDocuments(nextDocuments);
    } catch (_error) {
      setError('Unable to load documents.');
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleCreate = async () => {
    if (!title.trim()) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const document = await documentService.create({ title: title.trim(), content: '' });
      setTitle('');
      navigate(`/documents/${document.id}`);
    } catch (_error) {
      setError('Failed to create document.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      await documentService.remove(documentId);
      setDocuments((prev) => prev.filter((document) => document.id !== documentId));
    } catch (_error) {
      setError('Delete failed. Only owner can delete this document.');
    }
  };

  const docCountLabel = useMemo(() => {
    if (documents.length === 1) {
      return '1 document';
    }
    return `${documents.length} documents`;
  }, [documents.length]);

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="rounded-2xl bg-white p-6 shadow-card">
          <h1 className="font-heading text-2xl font-bold text-brand-900">Workspace Dashboard</h1>
          <p className="mt-2 text-sm text-brand-700">
            Manage your files, collaborate in real time, and track version history.
          </p>
          <p className="mt-4 text-sm font-semibold text-brand-600">{docCountLabel}</p>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-card">
          <h2 className="font-heading text-lg font-semibold text-brand-900">Create New Document</h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Product roadmap Q3"
              className="flex-1 rounded-lg border border-brand-200 px-3 py-2 outline-none ring-brand-300 focus:ring-2"
            />
            <button
              onClick={handleCreate}
              disabled={isSubmitting}
              className="rounded-lg bg-brand-600 px-5 py-2 font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </section>

        {error ? <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {documents.map((document) => (
            <article key={document.id} className="rounded-2xl bg-white p-5 shadow-card">
              <h3 className="font-heading text-lg font-semibold text-brand-900">{document.title}</h3>
              <p className="mt-1 text-xs text-brand-600">
                Permission: <strong>{document.currentUserPermission}</strong>
              </p>
              <p className="mt-3 text-sm text-brand-800">
                {document.content || 'No content yet. Open document to start editing.'}
              </p>
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => navigate(`/documents/${document.id}`)}
                  className="rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
                >
                  Open
                </button>
                <button
                  onClick={() => handleDelete(document.id)}
                  className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
          {documents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-brand-300 bg-white/70 p-8 text-center text-sm text-brand-700 md:col-span-2 xl:col-span-3">
              No documents yet. Create your first collaborative document.
            </div>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
};

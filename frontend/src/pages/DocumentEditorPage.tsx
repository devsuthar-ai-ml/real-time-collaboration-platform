import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { CollaborativeEditor } from '../components/editor/CollaborativeEditor';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';
import { documentService } from '../services/document.service';
import type { CursorEventPayload, DocumentEntity, VersionEntity } from '../types';

interface SocketAckResponse {
  ok: boolean;
  message?: string;
}

export const DocumentEditorPage = () => {
  const { id: documentId } = useParams<{ id: string }>();
  const { token } = useAuth();
  const socket = useSocket(token);
  const updateTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [document, setDocument] = useState<DocumentEntity | null>(null);
  const [content, setContent] = useState('');
  const [versions, setVersions] = useState<VersionEntity[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, CursorEventPayload>>({});
  const [notifications, setNotifications] = useState<string[]>([]);
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState<'READ' | 'WRITE'>('READ');
  const [error, setError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const isEditable = useMemo(() => {
    return document?.currentUserPermission === 'OWNER' || document?.currentUserPermission === 'WRITE';
  }, [document?.currentUserPermission]);

  const pushNotification = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setNotifications((prev) => [`${timestamp} - ${message}`, ...prev].slice(0, 5));
  };

  const loadData = useCallback(async () => {
    if (!documentId) {
      return;
    }
    try {
      setError(null);
      const [nextDocument, nextVersions] = await Promise.all([
        documentService.get(documentId),
        documentService.listVersions(documentId)
      ]);
      setDocument(nextDocument);
      setContent(nextDocument.content);
      setVersions(nextVersions);
    } catch (_error) {
      setError('Failed to load document.');
    }
  }, [documentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!socket || !documentId) {
      return;
    }

    socket.emit('document:join', { documentId }, (response: SocketAckResponse) => {
      if (!response.ok) {
        setError(response.message ?? 'Failed to join realtime session.');
      }
    });

    const onDocumentUpdate = (payload: { documentId: string; content: string; updatedAt: string }) => {
      if (payload.documentId !== documentId) {
        return;
      }
      setContent(payload.content);
      setDocument((prev) => (prev ? { ...prev, content: payload.content, updatedAt: payload.updatedAt } : prev));
    };

    const onCursorUpdate = (payload: CursorEventPayload) => {
      if (payload.documentId !== documentId) {
        return;
      }
      setRemoteCursors((prev) => ({
        ...prev,
        [payload.user.id]: payload
      }));
    };

    const onCollaboratorJoin = (payload: { documentId: string; user: { name: string } }) => {
      if (payload.documentId === documentId) {
        pushNotification(`${payload.user.name} joined this document`);
      }
    };

    socket.on('document:update', onDocumentUpdate);
    socket.on('cursor:update', onCursorUpdate);
    socket.on('notification:collaborator-joined', onCollaboratorJoin);

    return () => {
      socket.off('document:update', onDocumentUpdate);
      socket.off('cursor:update', onCursorUpdate);
      socket.off('notification:collaborator-joined', onCollaboratorJoin);
    };
  }, [socket, documentId]);

  useEffect(() => {
    return () => {
      if (updateTimeout.current) {
        clearTimeout(updateTimeout.current);
      }
    };
  }, []);

  const handleChange = (nextValue: string) => {
    setContent(nextValue);
    setDocument((prev) => (prev ? { ...prev, content: nextValue } : prev));
    if (!socket || !documentId || !isEditable) {
      return;
    }

    if (updateTimeout.current) {
      clearTimeout(updateTimeout.current);
    }
    updateTimeout.current = setTimeout(() => {
      socket.emit(
        'document:update',
        {
          documentId,
          content: nextValue
        },
        (response: SocketAckResponse) => {
          if (!response.ok) {
            setError(response.message ?? 'Failed to sync document updates.');
          }
        }
      );
    }, 300);
  };

  const handleCursorMove = (position: number, selectionStart?: number, selectionEnd?: number) => {
    if (!socket || !documentId) {
      return;
    }
    socket.emit('cursor:update', {
      documentId,
      position,
      selectionStart,
      selectionEnd
    });
  };

  const handleShare = async () => {
    if (!documentId || !shareEmail.trim()) {
      return;
    }
    setIsSharing(true);
    setError(null);
    try {
      const updatedDocument = await documentService.share(documentId, {
        email: shareEmail.trim(),
        permission: sharePermission
      });
      setDocument(updatedDocument);
      setShareEmail('');
      pushNotification(`Shared with ${shareEmail} as ${sharePermission}`);
    } catch (_error) {
      setError('Share failed. Ensure user exists and you are the owner.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    if (!documentId) {
      return;
    }
    try {
      setError(null);
      const updatedDocument = await documentService.restoreVersion(documentId, versionId);
      setDocument(updatedDocument);
      setContent(updatedDocument.content);
      const nextVersions = await documentService.listVersions(documentId);
      setVersions(nextVersions);
      pushNotification(`Restored version ${nextVersions[0]?.versionNumber ?? ''}`);
    } catch (_error) {
      setError('Version restore failed.');
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="rounded-2xl bg-white p-5 shadow-card">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link to="/dashboard" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                Back to dashboard
              </Link>
              <h1 className="font-heading text-2xl font-bold text-brand-900">
                {document?.title ?? 'Document editor'}
              </h1>
              <p className="text-xs text-brand-700">
                Permission: <strong>{document?.currentUserPermission ?? '-'}</strong>
              </p>
            </div>
            <div className="rounded-lg bg-brand-900 px-3 py-2 text-xs text-white">
              Realtime status: {socket?.connected ? 'Connected' : 'Connecting...'}
            </div>
          </div>
          {error ? <p className="mt-4 rounded bg-red-100 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        </section>

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <CollaborativeEditor
            value={content}
            isEditable={Boolean(isEditable)}
            remoteCursors={remoteCursors}
            onChange={handleChange}
            onCursorMove={handleCursorMove}
          />

          <aside className="space-y-6">
            <section className="rounded-2xl bg-white p-4 shadow-card">
              <h2 className="font-heading text-lg font-semibold text-brand-900">Share Access</h2>
              <p className="mt-1 text-xs text-brand-700">Owner can grant read/write access.</p>
              <div className="mt-3 space-y-3">
                <input
                  type="email"
                  value={shareEmail}
                  onChange={(event) => setShareEmail(event.target.value)}
                  placeholder="collaborator@email.com"
                  className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none ring-brand-300 focus:ring-2"
                />
                <select
                  value={sharePermission}
                  onChange={(event) => setSharePermission(event.target.value as 'READ' | 'WRITE')}
                  className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none ring-brand-300 focus:ring-2"
                >
                  <option value="READ">Read</option>
                  <option value="WRITE">Write</option>
                </select>
                <button
                  onClick={handleShare}
                  disabled={isSharing || document?.currentUserPermission !== 'OWNER'}
                  className="w-full rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSharing ? 'Sharing...' : 'Share Document'}
                </button>
              </div>

              <div className="mt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-700">Collaborators</h3>
                <ul className="mt-2 space-y-2 text-sm">
                  {document?.collaborators.map((collaborator) => (
                    <li key={collaborator.id} className="rounded-lg bg-brand-50 px-3 py-2">
                      <p className="font-semibold text-brand-900">{collaborator.user.name}</p>
                      <p className="text-xs text-brand-700">
                        {collaborator.user.email} - {collaborator.permission}
                      </p>
                    </li>
                  ))}
                  {(document?.collaborators.length ?? 0) === 0 ? (
                    <li className="text-xs text-brand-700">No collaborators yet.</li>
                  ) : null}
                </ul>
              </div>
            </section>

            <section className="rounded-2xl bg-white p-4 shadow-card">
              <h2 className="font-heading text-lg font-semibold text-brand-900">Version History</h2>
              <ul className="mt-3 max-h-64 space-y-2 overflow-auto pr-1">
                {versions.map((version) => (
                  <li key={version.id} className="rounded-lg border border-brand-100 p-3">
                    <p className="text-sm font-semibold text-brand-900">Version {version.versionNumber}</p>
                    <p className="text-xs text-brand-700">
                      {new Date(version.createdAt).toLocaleString()} by {version.createdBy.name}
                    </p>
                    <button
                      onClick={() => handleRestore(version.id)}
                      disabled={!isEditable}
                      className="mt-2 rounded-md border border-brand-300 px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Restore
                    </button>
                  </li>
                ))}
                {versions.length === 0 ? (
                  <li className="text-xs text-brand-700">No saved versions found yet.</li>
                ) : null}
              </ul>
            </section>

            <section className="rounded-2xl bg-white p-4 shadow-card">
              <h2 className="font-heading text-lg font-semibold text-brand-900">Realtime Notifications</h2>
              <ul className="mt-3 space-y-2 text-xs text-brand-800">
                {notifications.map((notification) => (
                  <li key={notification} className="rounded bg-brand-50 px-3 py-2">
                    {notification}
                  </li>
                ))}
                {notifications.length === 0 ? (
                  <li className="text-brand-700">No collaborator activity yet.</li>
                ) : null}
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
};

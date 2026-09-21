'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  getOdooSyncOutbox,
  collectPendingSyncData,
  executeOdooSync,
  retryFailedOdooSync,
  getOdooConnectionConfig,
} from '@/app/actions/odoo';
import { OdooSyncOutboxItem } from '@/types/database';
import { useCurrentUser } from '@/hooks/use-current-user';
import { OdooHeader } from './odoo-header';
import { OdooMetrics } from './odoo-metrics';
import { OdooOutboxTable } from './odoo-outbox-table';
import { OdooPayloadModal } from './odoo-payload-modal';

export function OdooSyncClient() {
  const [isPending, startTransition] = useTransition();
  const { email: rawUserEmail } = useCurrentUser();
  const userEmail = rawUserEmail || '';

  // Outbox Data State
  const [items, setItems] = useState<OdooSyncOutboxItem[]>([]);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [syncedCount, setSyncedCount] = useState<number>(0);
  const [failedCount, setFailedCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Connection State
  const [connectionConfig, setConnectionConfig] = useState<{
    isConfigured: boolean;
    mode: 'live' | 'sandbox';
    url: string | null;
  }>({
    isConfigured: false,
    mode: 'sandbox',
    url: null,
  });

  // Filter & Search
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Operation State
  const [actionMessage, setActionMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // JSON Preview Modal State
  const [previewItem, setPreviewItem] = useState<OdooSyncOutboxItem | null>(null);

  // Syncing specific ID state
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Initial config fetch
  useEffect(() => {
    const init = async () => {
      const cfg = await getOdooConnectionConfig();
      setConnectionConfig(cfg);
    };
    init();
  }, []);

  // Fetch Outbox
  const loadOutboxData = () => {
    setLoading(true);
    startTransition(async () => {
      const res = await getOdooSyncOutbox();
      if (!res.error) {
        setItems(res.items);
        setPendingCount(res.pendingCount);
        setSyncedCount(res.syncedCount);
        setFailedCount(res.failedCount);
        setTotalCount(res.totalCount);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    loadOutboxData();
  }, []);

  // Handler: Collect new pending data
  const handleCollectData = () => {
    setActionMessage(null);
    startTransition(async () => {
      const res = await collectPendingSyncData(userEmail);
      if (res.success) {
        setActionMessage({ type: 'success', text: res.message });
        loadOutboxData();
      } else {
        setActionMessage({
          type: 'error',
          text: res.error || res.message,
        });
      }
    });
  };

  // Handler: Sync all pending
  const handleSyncAllPending = () => {
    setActionMessage(null);
    startTransition(async () => {
      const res = await executeOdooSync({ executorEmail: userEmail });
      if (res.success) {
        setActionMessage({ type: 'success', text: res.message });
        loadOutboxData();
      } else {
        setActionMessage({
          type: 'error',
          text: res.error || res.message,
        });
      }
    });
  };

  // Handler: Sync specific item
  const handleSyncSingle = (outboxId: string) => {
    setSyncingId(outboxId);
    setActionMessage(null);
    startTransition(async () => {
      const res = await executeOdooSync({
        outboxIds: [outboxId],
        executorEmail: userEmail,
      });
      setSyncingId(null);
      if (res.success) {
        setActionMessage({ type: 'success', text: res.message });
        loadOutboxData();
      } else {
        setActionMessage({
          type: 'error',
          text: res.error || res.message,
        });
      }
    });
  };

  // Handler: Retry failed item
  const handleRetry = (outboxId: string) => {
    setSyncingId(outboxId);
    setActionMessage(null);
    startTransition(async () => {
      const res = await retryFailedOdooSync(outboxId, userEmail);
      setSyncingId(null);
      if (res.success) {
        setActionMessage({ type: 'success', text: res.message });
        loadOutboxData();
      } else {
        setActionMessage({
          type: 'error',
          text: res.error || res.message,
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Connection Status */}
      <OdooHeader
        connectionConfig={connectionConfig}
        pendingCount={pendingCount}
        isPending={isPending}
        actionMessage={actionMessage}
        onClearActionMessage={() => setActionMessage(null)}
        onCollectData={handleCollectData}
        onSyncAllPending={handleSyncAllPending}
      />

      {/* 2. Top Summary KPI Cards */}
      <OdooMetrics
        pendingCount={pendingCount}
        syncedCount={syncedCount}
        failedCount={failedCount}
        totalCount={totalCount}
      />

      {/* 3. Main Outbox Table & Filters */}
      <OdooOutboxTable
        items={items}
        loading={loading}
        pendingCount={pendingCount}
        syncedCount={syncedCount}
        failedCount={failedCount}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        entityFilter={entityFilter}
        setEntityFilter={setEntityFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        syncingId={syncingId}
        isPending={isPending}
        onPreviewPayload={(item) => setPreviewItem(item)}
        onSyncSingle={handleSyncSingle}
        onRetry={handleRetry}
        onCollectData={handleCollectData}
      />

      {/* 4. JSON Payload Inspector Modal */}
      <OdooPayloadModal
        previewItem={previewItem}
        onClose={() => setPreviewItem(null)}
      />
    </div>
  );
}

'use client'

import { useEffect, useState } from 'react'
import { KeyRound, Server, Shield, Webhook } from 'lucide-react'
import { AssistantNav } from './AssistantNav'

export function PrivateSettingsView({
  ownerUserId,
  encryptionConfigured,
  keyVersion,
  appUrl,
}: {
  ownerUserId: string
  encryptionConfigured: boolean
  keyVersion: string
  appUrl: string
}) {
  const [workerOnline, setWorkerOnline] = useState(false)

  useEffect(() => {
    fetch('/api/assistant/integrations')
      .then((r) => r.json())
      .then((d) => {
        const w = (d.integrations || []).find((i: any) => i.provider === 'browser_worker')
        setWorkerOnline(w?.status === 'connected')
      })
      .catch(() => {})
  }, [])

  return (
    <div>
      <AssistantNav workerOnline={workerOnline} />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
            <Shield className="h-5 w-5 text-emerald-500" />
            Single-User Access & RLS Boundary
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Access to all assistant endpoints, Server Components, and PostgreSQL tables is restricted via Supabase <code className="font-mono">getUser()</code> exact UUID verification and forced Row Level Security.
          </p>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-3 text-xs space-y-1.5 border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between">
              <span className="text-slate-500">Authorised Owner UUID:</span>
              <code className="font-mono text-slate-800 dark:text-slate-200">{ownerUserId}</code>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Execution Mode:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Private Single-User</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Human Approval Gate:</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">Always Enforced for External Tools</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
            <KeyRound className="h-5 w-5 text-blue-500" />
            AES-256-GCM Credential Encryption & Rotation
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Integration secrets are encrypted server-side using 256-bit AES-GCM with per-record random 12-byte IVs. The master key resides strictly in server environment variables.
          </p>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-3 text-xs space-y-1.5 border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between">
              <span className="text-slate-500">Master Key Status:</span>
              <span className={`font-semibold ${encryptionConfigured ? 'text-emerald-600' : 'text-amber-600'}`}>
                {encryptionConfigured ? 'Configured (32-Byte Validated)' : 'Not Configured in Environment'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Active Key Version:</span>
              <code className="font-mono text-slate-800 dark:text-slate-200">{keyVersion}</code>
            </div>
            <div className="pt-1">
              <span className="text-slate-500 block mb-1">Key Rotation CLI Command:</span>
              <code className="block rounded bg-slate-900 px-2.5 py-1.5 font-mono text-[11px] text-emerald-300">
                node scripts/rotate-assistant-keys.mjs --apply
              </code>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
            <Server className="h-5 w-5 text-indigo-500" />
            Persistent Background Worker Execution
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Playwright browser automation and long-running rendering pipelines execute in the dedicated worker process using PostgreSQL <code className="font-mono">FOR UPDATE SKIP LOCKED</code> leases and stale-job recovery.
          </p>
          <div className="space-y-2 rounded-xl bg-slate-950 p-3 font-mono text-[11px] text-slate-200">
            <p className="text-slate-400"># Windows Watchdog Supervisor (auto-restart):</p>
            <p className="text-emerald-300">powershell -ExecutionPolicy Bypass -File scripts/run-assistant-worker.ps1</p>
            <p className="text-slate-400 pt-1"># PM2 Process Manager (VPS / Always-On Host):</p>
            <p className="text-emerald-300">pm2 start ecosystem.worker.config.cjs</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
            <Webhook className="h-5 w-5 text-purple-500" />
            ChatGPT Apps SDK, MCP &amp; Webhook Endpoints
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Shared backend endpoints ready for ChatGPT Apps SDK / Actions and optional external callbacks. Protected by owner UUID auth, bearer tokens, and event deduplication.
          </p>
          <div className="space-y-2 text-xs">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-3 border border-slate-200 dark:border-slate-800">
              <p className="font-semibold text-slate-700 dark:text-slate-300">Shared MCP Server (JSON-RPC 2.0)</p>
              <code className="block mt-1 font-mono text-[11px] text-blue-600 dark:text-blue-400 break-all">
                {appUrl}/api/assistant/mcp
              </code>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-3 border border-slate-200 dark:border-slate-800">
              <p className="font-semibold text-slate-700 dark:text-slate-300">ChatGPT Apps SDK OpenAPI 3.1 Schema</p>
              <code className="block mt-1 font-mono text-[11px] text-blue-600 dark:text-blue-400 break-all">
                {appUrl}/api/assistant/mcp?format=openapi
              </code>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-3 border border-slate-200 dark:border-slate-800">
              <p className="font-semibold text-slate-700 dark:text-slate-300">Telegram Webhook URL (Optional)</p>
              <code className="block mt-1 font-mono text-[11px] text-blue-600 dark:text-blue-400 break-all">
                {appUrl}/api/assistant/telegram/webhook
              </code>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-3 border border-slate-200 dark:border-slate-800">
              <p className="font-semibold text-slate-700 dark:text-slate-300">Make.com Callback URL (Optional)</p>
              <code className="block mt-1 font-mono text-[11px] text-blue-600 dark:text-blue-400 break-all">
                {appUrl}/api/assistant/webhooks/make
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

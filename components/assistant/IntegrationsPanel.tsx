'use client'

import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Link2,
  Loader2,
  Power,
  RefreshCw,
  ShieldCheck,
  Unlink,
  Wrench,
  XCircle,
} from 'lucide-react'
import { AssistantNav } from './AssistantNav'

interface IntegrationItem {
  provider: string
  label: string
  description: string
  enabled: boolean
  status: 'connected' | 'disconnected' | 'unconfigured' | 'error'
  configuredVia: string
  verificationMode: string
  lastTestedAt: string | null
  lastError: string | null
  secretPreview: string
  credentialFields: Array<{ key: string; label: string; placeholder: string; secret: boolean }>
  metadata: Record<string, unknown>
}

interface TelegramLinkState {
  linked: boolean
  telegramUserId: number | null
  telegramUsername: string | null
  verifiedAt: string | null
  pendingTokenExpiresAt: string | null
}

export function IntegrationsPanel() {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([])
  const [encryptionConfigured, setEncryptionConfigured] = useState(true)
  const [telegramLink, setTelegramLink] = useState<TelegramLinkState | null>(null)
  const [linkingCode, setLinkingCode] = useState<{ code: string; expiresAt: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [testingProvider, setTestingProvider] = useState<string | null>(null)
  const [editingProvider, setEditingProvider] = useState<string | null>(null)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [intRes, tgRes] = await Promise.all([
        fetch('/api/assistant/integrations'),
        fetch('/api/assistant/telegram/link'),
      ])
      if (intRes.ok) {
        const data = await intRes.json()
        setIntegrations(data.integrations || [])
        setEncryptionConfigured(Boolean(data.encryptionKeyConfigured))
      }
      if (tgRes.ok) {
        setTelegramLink(await tgRes.json())
      }
    } catch {
      toast.error('Failed to load integration statuses')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const workerItem = integrations.find((i) => i.provider === 'browser_worker')
  const workerOnline = workerItem?.status === 'connected'

  const handleTest = async (provider: string) => {
    setTestingProvider(provider)
    try {
      const res = await fetch('/api/assistant/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      })
      const data = await res.json()
      if (data.ok) {
        toast.success(data.message)
      } else {
        toast.error(data.message || 'Connection check failed')
      }
      await loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Test request failed')
    } finally {
      setTestingProvider(null)
    }
  }

  const handleToggle = async (item: IntegrationItem) => {
    try {
      const res = await fetch('/api/assistant/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: item.provider, enabled: !item.enabled }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update toggle')
      setIntegrations(data.integrations || [])
      toast.success(`${item.label} ${item.enabled ? 'disabled' : 'enabled'}.`)
    } catch (err: any) {
      toast.error(err?.message || 'Toggle failed')
    }
  }

  const handleDisconnect = async (item: IntegrationItem) => {
    try {
      const res = await fetch('/api/assistant/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: item.provider, disconnect: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to disconnect')
      setIntegrations(data.integrations || [])
      toast.success(`${item.label} credentials cleared and disconnected.`)
    } catch (err: any) {
      toast.error(err?.message || 'Disconnect failed')
    }
  }

  const handleSaveCredentials = async (provider: string) => {
    setSaving(true)
    try {
      const res = await fetch('/api/assistant/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, credentials: formValues, enabled: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to encrypt & save credentials')
      setIntegrations(data.integrations || [])
      setEditingProvider(null)
      setFormValues({})
      toast.success('Credentials encrypted (AES-256-GCM) and saved securely. Secrets will not be displayed again.')
    } catch (err: any) {
      toast.error(err?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleGenerateTelegramCode = async () => {
    try {
      const res = await fetch('/api/assistant/telegram/link', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate code')
      setLinkingCode({ code: data.code, expiresAt: data.expiresAt })
      toast.success('Generated 5-minute single-use Telegram linking code.')
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create linking token')
    }
  }

  const handleUnlinkTelegram = async () => {
    try {
      const res = await fetch('/api/assistant/telegram/link', { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to unlink Telegram')
      setLinkingCode(null)
      await loadData()
      toast.success('Telegram account link removed.')
    } catch (err: any) {
      toast.error(err?.message || 'Failed to unlink')
    }
  }

  return (
    <div>
      <AssistantNav workerOnline={workerOnline} />

      {!encryptionConfigured && (
        <div className="mb-6 rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4 flex items-start gap-3 text-sm text-amber-900 dark:text-amber-200">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
          <div>
            <p className="font-semibold">AES-256-GCM Master Key Required for Vault Storage</p>
            <p className="text-xs mt-1">
              Set a 32-byte key in <code className="font-mono">ASSISTANT_ENCRYPTION_KEY</code> in your server environment before saving encrypted credentials through the UI. Environment variable credentials still show read-only status cleanly.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading connected accounts...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {integrations.map((item) => {
            const isConnected = item.status === 'connected'
            const isError = item.status === 'error'
            return (
              <div
                key={item.provider}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">{item.label}</h2>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{item.description}</p>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                        isConnected
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                          : isError
                          ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800'
                          : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {isConnected ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : isError ? (
                        <XCircle className="h-3.5 w-3.5" />
                      ) : (
                        <Unlink className="h-3.5 w-3.5" />
                      )}
                      {item.status}
                    </span>
                  </div>

                  <div className="mt-4 space-y-1.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Credential Vault:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{item.secretPreview}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Verification Mode:</span>
                      <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        {item.verificationMode}
                      </span>
                    </div>
                    {item.lastTestedAt && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Last Tested:</span>
                        <span className="text-slate-600 dark:text-slate-400">
                          {new Date(item.lastTestedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {item.lastError && (
                      <p className="mt-2 rounded-lg bg-red-50 dark:bg-red-950/40 p-2 text-[11px] text-red-600 dark:text-red-300">
                        {item.lastError}
                      </p>
                    )}
                  </div>

                  {/* Verified Telegram Linking Box */}
                  {item.provider === 'telegram' && (
                    <div className="mt-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 p-3.5 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-blue-900 dark:text-blue-200">
                          <ShieldCheck className="h-4 w-4" />
                          Verified Account Link
                        </span>
                        {telegramLink?.linked ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            Linked (ID {telegramLink.telegramUserId})
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">Unlinked</span>
                        )}
                      </div>

                      {linkingCode && (
                        <div className="rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 p-2.5">
                          <p className="text-[11px] text-slate-500 mb-1">
                            Send this single-use command in private chat with your bot (expires {new Date(linkingCode.expiresAt).toLocaleTimeString()}):
                          </p>
                          <code className="block font-mono text-xs font-bold text-blue-700 dark:text-blue-300">
                            /link {linkingCode.code}
                          </code>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handleGenerateTelegramCode}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          <Link2 className="h-3.5 w-3.5" />
                          Generate 5-Min Link Code
                        </button>
                        {telegramLink?.linked && (
                          <button
                            type="button"
                            onClick={handleUnlinkTelegram}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-800 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-300 hover:bg-red-50"
                          >
                            Unlink
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Encrypted Credentials Edit Drawer */}
                  {editingProvider === item.provider && item.credentialFields.length > 0 && (
                    <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-4 space-y-3">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <KeyRound className="h-3.5 w-3.5 text-blue-500" />
                        Update Credentials (AES-256-GCM Encrypted Server-Side)
                      </p>
                      {item.credentialFields.map((field) => (
                        <div key={field.key}>
                          <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                            {field.label}
                          </label>
                          <input
                            type={field.secret ? 'password' : 'text'}
                            autoComplete="new-password"
                            placeholder={field.placeholder}
                            value={formValues[field.key] || ''}
                            onChange={(e) =>
                              setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                            }
                            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                          />
                        </div>
                      ))}
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => handleSaveCredentials(item.provider)}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {saving ? 'Encrypting...' : 'Encrypt & Save'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProvider(null)
                            setFormValues({})
                          }}
                          className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <button
                    type="button"
                    disabled={testingProvider === item.provider}
                    onClick={() => handleTest(item.provider)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                  >
                    {testingProvider === item.provider ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    Test Connection
                  </button>

                  {item.credentialFields.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProvider(editingProvider === item.provider ? null : item.provider)
                        setFormValues({})
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <Wrench className="h-3.5 w-3.5" />
                      {isConnected ? 'Reconnect / Update' : 'Configure Keys'}
                    </button>
                  )}

                  {item.provider !== 'browser_worker' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleToggle(item)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <Power className="h-3.5 w-3.5" />
                        {item.enabled ? 'Disable' : 'Enable'}
                      </button>

                      {isConnected && (
                        <button
                          type="button"
                          onClick={() => handleDisconnect(item)}
                          className="ml-auto text-xs font-medium text-red-600 hover:underline"
                        >
                          Clear Vault
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

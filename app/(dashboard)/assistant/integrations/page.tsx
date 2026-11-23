import { redirect } from 'next/navigation'
import { requireAssistantOwner } from '@/lib/assistant/auth'
import { IntegrationsPanel } from '@/components/assistant/IntegrationsPanel'

export const dynamic = 'force-dynamic'

export default async function AssistantIntegrationsPage() {
  const auth = await requireAssistantOwner()
  if (!auth.authorized) {
    redirect(auth.status === 401 ? '/auth/login' : '/dashboard')
  }

  return <IntegrationsPanel />
}

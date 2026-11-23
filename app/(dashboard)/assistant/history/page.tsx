import { redirect } from 'next/navigation'
import { requireAssistantOwner } from '@/lib/assistant/auth'
import { AutomationHistoryView } from '@/components/assistant/AutomationHistoryView'

export const dynamic = 'force-dynamic'

export default async function AssistantHistoryPage() {
  const auth = await requireAssistantOwner()
  if (!auth.authorized) {
    redirect(auth.status === 401 ? '/auth/login' : '/dashboard')
  }

  return <AutomationHistoryView />
}

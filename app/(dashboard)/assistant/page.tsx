import { redirect } from 'next/navigation'
import { requireAssistantOwner } from '@/lib/assistant/auth'
import { AssistantWorkspace } from '@/components/assistant/AssistantWorkspace'

export const dynamic = 'force-dynamic'

export default async function AssistantPage() {
  const auth = await requireAssistantOwner()
  if (!auth.authorized) {
    redirect(auth.status === 401 ? '/auth/login' : '/dashboard')
  }

  return <AssistantWorkspace />
}

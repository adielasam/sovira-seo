import { redirect } from 'next/navigation'
import { requireAssistantOwner } from '@/lib/assistant/auth'
import { getActiveKeyVersion, isEncryptionConfigured } from '@/lib/assistant/crypto'
import { PrivateSettingsView } from '@/components/assistant/PrivateSettingsView'

export const dynamic = 'force-dynamic'

export default async function AssistantSettingsPage() {
  const auth = await requireAssistantOwner()
  if (!auth.authorized) {
    redirect(auth.status === 401 ? '/auth/login' : '/dashboard')
  }

  return (
    <PrivateSettingsView
      ownerUserId={auth.userId}
      encryptionConfigured={isEncryptionConfigured()}
      keyVersion={getActiveKeyVersion()}
      appUrl={process.env.NEXT_PUBLIC_APP_URL || 'https://www.sovira.com.ng'}
    />
  )
}

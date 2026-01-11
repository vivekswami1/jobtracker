'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { LogIn } from 'lucide-react'

interface AuthButtonProps {
  size?: 'default' | 'sm' | 'lg' | 'icon'
  variant?: 'default' | 'outline' | 'secondary'
}

export function AuthButton({ size = 'default', variant = 'default' }: AuthButtonProps) {
  const supabase = createClient()

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <Button onClick={handleLogin} size={size} variant={variant}>
      <LogIn className="h-4 w-4 mr-2" />
      Get Started with Google
    </Button>
  )
}

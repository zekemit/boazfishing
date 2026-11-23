'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminLoginForm } from '../AdminLoginForm';
import { LogoMark } from '../site/Logo';

export function AdminGate() {
  const router = useRouter();
  return (
    <main className="flex min-h-[100svh] items-center justify-center bg-river-900 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-sand p-7 shadow-lift">
        <div className="flex items-center gap-3">
          <LogoMark className="h-11 w-11" />
          <div className="leading-tight">
            <h1 className="display-md text-2xl">Instructor login</h1>
            <p className="text-sm text-ink-mute">Boaz Fishing Co.</p>
          </div>
        </div>
        <div className="mt-6">
          <AdminLoginForm autoFocus onSuccess={() => router.refresh()} />
        </div>
        <Link href="/" className="mt-5 inline-block text-sm font-semibold text-river underline underline-offset-4">
          Back to the site
        </Link>
      </div>
    </main>
  );
}

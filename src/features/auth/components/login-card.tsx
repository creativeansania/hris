'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';

export function LoginCard() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Map known error codes to polite Indonesian explanation
  const getErrorMessage = (code: string | null) => {
    if (!code) return null;
    switch (code) {
      case 'unregistered':
        return 'Email Google Workspace Anda belum terdaftar di sistem HRIS. Silakan hubungi tim HR perusahaan.';
      case 'account_disabled':
        return 'Akun karyawan Anda berstatus non-aktif. Silakan hubungi bagian SDM / HR.';
      case 'claim_failed':
        return 'Aktivasi akun pertama kali tidak berhasil. Silakan coba login kembali.';
      case 'db_error':
        return 'Gagal memverifikasi data karyawan di basis data. Silakan coba beberapa saat lagi.';
      case 'missing_code':
        return 'Autentikasi gagal atau sesi telah kedaluwarsa. Silakan coba lagi.';
      default:
        return decodeURIComponent(code);
    }
  };

  const activeError = errorMessage || getErrorMessage(errorParam);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const supabase = createClient();
    const isPlaceholder =
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isPlaceholder) {
      // In development placeholder mode, simulate or guide the developer
      setErrorMessage(
        'Supabase project credentials belum diset di .env.local. Masukkan NEXT_PUBLIC_SUPABASE_URL & ANON_KEY untuk mengaktifkan Google OAuth sesungguhnya.'
      );
      setIsLoading(false);
      return;
    }

    try {
      const redirectUrl = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Gagal menghubungi server autentikasi.'
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#111827]/90 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-8 shadow-2xl shadow-black/40">
      {/* Brand & Badge */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700/80 flex items-center justify-center p-1.5 mb-4 shadow-inner ring-1 ring-white/10">
          <Image
            src="/icons/logo.png"
            alt="HRIS Platform"
            width={56}
            height={56}
            className="object-cover rounded-xl"
            priority
          />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-blue-500/10 border-blue-500/20 text-blue-400 mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Single Sign-On (SSO) Portal</span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
          HRIS Enterprise
        </h1>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          Sistem Informasi SDM, Presensi GPS Geofencing & Manajemen Pengajuan
        </p>
      </div>

      {/* Error alert banner */}
      {activeError && (
        <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-left">
          <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
          <div className="text-xs text-rose-300 leading-relaxed">
            {activeError}
          </div>
        </div>
      )}

      {/* OAuth Action */}
      <div className="space-y-4">
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full h-12 px-4 rounded-xl font-medium text-sm text-slate-200 bg-[#161f33] hover:bg-[#1c2742] border border-slate-700/80 hover:border-slate-600 transition-all duration-150 flex items-center justify-center gap-3 shadow-sm active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed group"
        >
          {isLoading ? (
            <div className="flex items-center gap-2 text-slate-400">
              <svg
                className="animate-spin h-4 w-4 text-blue-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              <span>Menghubungkan ke Google...</span>
            </div>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.27 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.73 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span className="font-semibold text-slate-100">
                Masuk dengan Google Workspace
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </>
          )}
        </button>

        {/* Development preview bypass (only in local development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="pt-2 text-center">
            <a
              href="/dashboard?dev=1"
              className="text-[11px] text-slate-500 hover:text-slate-400 underline underline-offset-4 transition"
            >
              Pratinjau Dashboard Shell (Mode Pengembangan) &rarr;
            </a>
          </div>
        )}
      </div>

      {/* Security notice footnote */}
      <div className="mt-8 pt-6 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1 text-center">
        <p>Hanya akun Google Workspace resmi perusahaan yang dapat mengakses.</p>
        <p className="text-slate-400">
          Akun baru otomatis diklaim saat autentikasi pertama berhasil.
        </p>
      </div>
    </div>
  );
}

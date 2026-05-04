"use client"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Anchor } from "lucide-react"

function SetupForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const email = searchParams.get("email") || ""
  const token = searchParams.get("token") || ""
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (password.length < 6) { setError("パスワードは6文字以上で入力してください"); return }
    if (password !== confirmPassword) { setError("パスワードが一致しません"); return }

    setLoading(true)
    try {
      const res = await fetch("/api/users/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "パスワード設定に失敗しました") }
      else { setSuccess(true); setTimeout(() => router.push("/login"), 2000) }
    } catch { setError("エラーが発生しました") }
    finally { setLoading(false) }
  }

  if (!email || !token) {
    return (
      <div className="rounded-lg bg-white px-8 py-10 shadow-md text-center">
        <p className="text-red-600">無効なリンクです。管理者に再招待を依頼してください。</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-white px-8 py-10 shadow-md">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600">
          <Anchor className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">パスワード設定</h1>
        <p className="mt-1 text-sm text-gray-500">初回ログイン用のパスワードを設定してください</p>
      </div>

      {success ? (
        <div className="rounded-md bg-emerald-50 p-4 text-center">
          <p className="text-sm text-emerald-700 font-semibold">パスワードを設定しました</p>
          <p className="text-xs text-emerald-600 mt-1">ログイン画面に移動します...</p>
        </div>
      ) : (
        <>
          {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <div className="mb-4 rounded-md bg-slate-50 p-3 text-sm">
            <span className="text-slate-500">メールアドレス:</span>
            <span className="ml-2 font-medium">{email}</span>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">パスワード</label>
              <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="6文字以上" />
            </div>
            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-gray-700">パスワード（確認）</label>
              <input id="confirm" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="もう一度入力" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">
              {loading ? "設定中..." : "パスワードを設定してログイン"}
            </button>
          </form>
        </>
      )}
    </div>
  )
}

export default function SetupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md">
        <Suspense fallback={<div className="rounded-lg bg-white px-8 py-10 shadow-md text-center text-slate-500">読み込み中...</div>}>
          <SetupForm />
        </Suspense>
      </div>
    </div>
  )
}

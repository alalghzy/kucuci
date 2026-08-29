import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/useAuthStore'
import { Button } from '../components/ui/Button'

export default function AdminLogin() {
  const nav = useNavigate()
  const { login } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')

  const handleAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    if (!email.trim() || !password) { setErr('Isi email dan password'); return }
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      })
      const data = await res.json()
      if (res.ok && data.user) {
        login({ id: data.user.id, name: data.user.name, email, avatar_url: '', role: data.user.role || 'admin', created_at: new Date().toISOString() })
        nav('/admin')
        return
      }
      setErr(data.error || 'Email atau password salah')
    } catch {
      setErr('Tidak dapat menghubungi server. Coba lagi.')
    }
  }

  const input = 'w-full border-2 border-slate-100 rounded-xl p-3.5 text-sm focus:border-primary outline-none transition'

  return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-gradient-to-b from-slate-100 to-slate-50 p-6 flex items-center justify-center">
      <div className="w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto bg-slate-800 rounded-2xl flex items-center justify-center text-3xl shadow-lg">🛠️</div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-4">Admin KuCuci</h1>
          <p className="text-sm text-slate-500 mt-1">Panel khusus administrator</p>
        </div>

        <form onSubmit={handleAdmin} className="bg-white rounded-3xl shadow-card p-6 space-y-4">
          <h2 className="font-bold text-slate-800 text-center">Login Admin</h2>
          <input className={input} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input className={input} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
          {err && <p className="text-red-500 text-xs">{err}</p>}
          <Button type="submit" className="w-full">Masuk Admin</Button>
          <button type="button" onClick={() => nav('/login')} className="w-full text-sm text-slate-500 hover:text-slate-700">‹ Kembali</button>
        </form>
      </div>
    </div>
  )
}
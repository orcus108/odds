import Navbar from '@/components/Navbar'
import CreateMarketForm from '@/components/CreateMarketForm'
import Link from 'next/link'

export default function CreateMarketPage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-zinc-500 hover:text-zinc-300 transition text-sm">
            ← Admin
          </Link>
          <h1 className="text-2xl font-bold text-zinc-100">Create Market</h1>
        </div>

        <CreateMarketForm />
      </main>
    </div>
  )
}

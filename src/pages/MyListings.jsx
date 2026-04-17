import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import CountdownTimer from '../components/CountdownTimer'
import { getPrimaryImage } from '../lib/itemMedia'

const CONDITION_COLORS = {
  'Like New': 'text-green-400',
  'Good': 'text-yellow-400',
  'Fair': 'text-orange-400',
}

export default function MyListings() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(null)
  const [error, setError] = useState('')
  const [currentUserId, setCurrentUserId] = useState(null)
  const navigate = useNavigate()

  const fetchMyItems = async (userId) => {
    setLoading(true)
    setError('')
    const { data, error: fetchError } = await supabase
      .from('items')
      .select('*')
      .eq('seller_id', userId)
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setItems([])
    } else {
      setItems(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    let active = true

    const hydrate = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!active) return

      if (!session?.user) {
        navigate('/login', { replace: true })
        return
      }

      setCurrentUserId(session.user.id)
      await fetchMyItems(session.user.id)
    }

    hydrate()

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        navigate('/login', { replace: true })
        return
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setCurrentUserId(session.user.id)
        fetchMyItems(session.user.id)
      }
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [navigate])

  const markAsSold = async (itemId) => {
    setMarking(itemId)
    setError('')

    const { data: updatedRows, error: updateError } = await supabase
      .from('items')
      .update({ is_sold: true })
      .eq('id', itemId)
      .eq('seller_id', currentUserId)
      .select('id')

    if (updateError) {
      setError(updateError.message)
      setMarking(null)
      return
    }
    if (!updatedRows?.length) {
      setError('Listing not found or you do not have access.')
      setMarking(null)
      return
    }

    setItems(prev => prev.map(i => i.id === itemId ? { ...i, is_sold: true } : i))
    setMarking(null)
  }

  const deleteItem = async (itemId) => {
    if (!window.confirm('Delete this listing permanently?')) return
    setError('')

    const { data: deletedRows, error: deleteError } = await supabase
      .from('items')
      .delete()
      .eq('id', itemId)
      .eq('seller_id', currentUserId)
      .select('id')

    if (deleteError) {
      setError(deleteError.message)
      return
    }
    if (!deletedRows?.length) {
      setError('Listing not found or you do not have access.')
      return
    }

    setItems(prev => prev.filter(i => i.id !== itemId))
  }

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-[#1C1C2E] rounded w-1/2 mb-3" />
              <div className="h-3 bg-[#1C1C2E] rounded w-1/4" />
            </div>
          ))}
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black" style={{ color: 'var(--color-text)' }}>My Listings</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          {items.length} listing{items.length !== 1 ? 's' : ''} total
        </p>
      </div>

      {error && (
        <p className="text-sm font-semibold" style={{ color: 'var(--color-fomo)' }}>
          {error}
        </p>
      )}

      {items.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📦</p>
          <p className="font-semibold" style={{ color: 'var(--color-text)' }}>No listings yet.</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Hit &ldquo;Sell My Stuff&rdquo; to post your first item.</p>
        </div>
      )}

      <div className="space-y-3" id="my-listings-list">
        {items.map(item => {
          const primaryImage = getPrimaryImage(item)
          return (
          <div key={item.id} id={`my-item-${item.id}`}
            className={`card p-4 flex gap-4 items-start ${item.is_sold ? 'opacity-50' : ''}`}>
            {/* Image */}
            {primaryImage && (
              <img src={primaryImage} alt={item.title}
                className="w-20 h-20 object-cover rounded-xl flex-shrink-0" />
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold truncate" style={{ color: 'var(--color-text)' }}>{item.title}</h3>
                <span className="font-black flex-shrink-0" style={{ color: 'var(--color-accent)' }}>₹{item.price}</span>
              </div>
              <p className={`text-xs font-semibold mt-1 ${CONDITION_COLORS[item.condition] || 'text-gray-400'}`}>
                {item.condition}
              </p>
              <div className="mt-2">
                {item.is_sold
                  ? <span className="badge-sold">✓ SOLD</span>
                  : <CountdownTimer expiresAt={item.expires_at} />}
              </div>
            </div>

            {/* Actions */}
            {!item.is_sold && (
              <div className="flex flex-col gap-2 flex-shrink-0">
                <button
                  id={`mark-sold-${item.id}`}
                  onClick={() => markAsSold(item.id)}
                  disabled={marking === item.id}
                  className="text-xs font-bold px-3 py-2 rounded-xl border border-available text-available hover:bg-available/10 transition-colors disabled:opacity-50">
                  {marking === item.id ? '...' : '✓ Mark Sold'}
                </button>
                <button
                  id={`delete-${item.id}`}
                  onClick={() => deleteItem(item.id)}
                  className="text-xs font-bold px-3 py-2 rounded-xl border border-red-800/50 text-red-500 hover:bg-red-900/10 transition-colors">
                  Delete
                </button>
              </div>
            )}
          </div>
        )})}
      </div>
    </main>
  )
}

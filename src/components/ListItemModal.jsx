import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getSellerUsername, parseItemImages } from '../lib/itemMedia'

function openWhatsApp(sellerPhone, itemTitle, price) {
  const message = encodeURIComponent(
    `Hi! I saw your listing on NSEC FlashDrop — *${itemTitle}* for ₹${price}. Is it still available? I can come pick it up today!`
  )
  window.open(`https://wa.me/${sellerPhone}?text=${message}`, '_blank')
}

export default function ListItemModal({ item, currentUser, onClose }) {
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const images = useMemo(() => parseItemImages(item), [item])
  const activeImage = images[activeImageIndex] || null
  const sellerUsername = getSellerUsername(item).toUpperCase()

  useEffect(() => {
    const onEscape = event => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [onClose])

  const handleClaim = async () => {
    setError('')

    if (!item?.seller_whatsapp) {
      setError('Seller WhatsApp is missing for this listing.')
      return
    }
    if (!currentUser) {
      setError('Sign in with your NSEC email to claim this item.')
      navigate('/login')
      return
    }

    setClaiming(true)
    try {
      const { data: insertedRows, error: interestError } = await supabase
        .from('interest_clicks')
        .upsert(
          { item_id: item.id, user_id: currentUser.id },
          { onConflict: 'item_id,user_id', ignoreDuplicates: true }
        )
        .select('id')

      if (interestError) throw interestError

      if (insertedRows?.length) {
        const { error: rpcError } = await supabase.rpc('increment_interest', { item_id: item.id })
        if (rpcError) throw rpcError
      }

      openWhatsApp(item.seller_whatsapp, item.title, item.price)
    } catch (claimError) {
      setError(claimError.message || 'Could not claim item right now.')
    } finally {
      setClaiming(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[94vh] overflow-y-auto border-[4px]"
        style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', boxShadow: '8px 8px 0px 0px rgba(0,0,0,1)' }}
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 sm:p-5 border-b-[4px]" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="text-sm sm:text-lg font-black uppercase tracking-wide" style={{ color: 'var(--color-text)' }}>
            Listing Details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-lg sm:text-xl font-black border-[4px] px-3 py-1 leading-none"
            style={{ color: 'var(--color-text)', borderColor: 'var(--color-border)', background: 'var(--color-card)' }}
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="p-4 sm:p-5 border-b-[4px] md:border-b-0 md:border-r-[4px]" style={{ borderColor: 'var(--color-border)' }}>
            <div className="w-full aspect-square border-[4px] flex items-center justify-center overflow-hidden" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-muted)' }}>
              {activeImage ? (
                <img src={activeImage} alt={item?.title || 'Listing image'} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-black uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                  No Image
                </span>
              )}
            </div>

            {images.length > 1 && (
              <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 mt-3">
                {images.map((img, idx) => (
                  <button
                    key={`${img}-${idx}`}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className="aspect-square border-[4px] overflow-hidden"
                    style={{
                      borderColor: activeImageIndex === idx ? 'var(--color-accent)' : 'var(--color-border)',
                      boxShadow: activeImageIndex === idx ? '4px 4px 0px 0px rgba(0,0,0,1)' : 'none',
                    }}
                  >
                    <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 sm:p-5 flex flex-col min-h-[420px]">
            <p className="text-xs font-black uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>
              Seller: {sellerUsername}
            </p>

            <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight leading-tight" style={{ color: 'var(--color-text)' }}>
              {item?.title}
            </h3>

            <p className="inline-block mt-3 text-xl sm:text-2xl font-black uppercase px-3 py-1 border-[4px]" style={{ background: 'var(--color-price-bg)', color: 'var(--color-price-text)', borderColor: 'var(--color-border)', boxShadow: '6px 6px 0px 0px rgba(0,0,0,1)' }}>
              ₹{item?.price}
            </p>

            <div className="mt-5 border-[4px] p-3 min-h-[120px]" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-muted)' }}>
              <p className="text-xs font-black uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Description
              </p>
              <p className="text-sm font-semibold leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-text)' }}>
                {item?.description || 'No description provided.'}
              </p>
            </div>

            {error && (
              <p className="text-xs font-black uppercase mt-3" style={{ color: 'var(--color-fomo)' }}>
                {error}
              </p>
            )}

            <div className="mt-auto pt-4">
              <button
                id={`claim-${item?.id}`}
                type="button"
                onClick={handleClaim}
                disabled={claiming || item?.is_sold}
                className="w-full border-[4px] py-4 px-4 text-sm sm:text-base font-black uppercase tracking-wider disabled:opacity-60"
                style={{ color: 'var(--color-bg)', background: 'var(--color-accent)', borderColor: 'var(--color-border)', boxShadow: '8px 8px 0px 0px rgba(0,0,0,1)' }}
              >
                {item?.is_sold ? 'Already Sold' : claiming ? 'Claiming...' : 'Claim on WhatsApp'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

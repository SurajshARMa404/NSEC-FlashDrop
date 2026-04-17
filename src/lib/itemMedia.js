export function parseItemImages(item) {
  const imageUrlsField = item?.image_urls
  if (Array.isArray(imageUrlsField)) {
    return imageUrlsField.filter(Boolean)
  }

  const raw = item?.image_url
  if (!raw) return []

  if (Array.isArray(raw)) {
    return raw.filter(Boolean)
  }

  if (typeof raw !== 'string') {
    return []
  }

  const value = raw.trim()
  if (!value) return []

  if (value.startsWith('[')) {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean)
      }
    } catch {
      return []
    }
  }

  return [value]
}

export function getPrimaryImage(item) {
  const images = parseItemImages(item)
  return images[0] || null
}

export function getSellerUsername(item) {
  const fromEmail = item?.seller_email || item?.email
  if (typeof fromEmail === 'string' && fromEmail.includes('@')) {
    return fromEmail.split('@')[0]
  }

  const fromName = item?.seller_name
  if (typeof fromName === 'string' && fromName.trim()) {
    return fromName.trim()
  }

  return 'seller'
}

import { useState } from 'react'
import { Package } from 'lucide-react'

export default function ProductImage({ product, variant, eager = false }) {
  const path = variant?.imagePath || product?.imagePath
  const [failed, setFailed] = useState(null)
  const localPath = typeof path === 'string' && /^\/(?![\\/])/.test(path) && !path.includes('\\') ? path : null
  const title = product?.title || 'Product'
  const label = variant?.label && variant.label !== 'Standard' ? `${title}, ${variant.label}` : title

  return <div className="product-image">
    {localPath && failed !== localPath
      ? <img src={localPath} alt={label} loading={eager ? 'eager' : 'lazy'} onError={() => setFailed(localPath)} />
      : <span role="img" aria-label={`${label} image unavailable`}><Package size={28} /></span>}
  </div>
}

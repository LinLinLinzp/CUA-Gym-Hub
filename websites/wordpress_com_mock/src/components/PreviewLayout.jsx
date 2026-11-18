import React, { useState } from 'react'
import { Monitor, Smartphone } from 'lucide-react'

export default function PreviewLayout({ children }) {
  const [width, setWidth] = useState('desktop')
  return <div className={'preview-layout ' + width}>
    <div className="preview-options" aria-label="Preview width">
      <button type="button" className="button subtle" aria-pressed={width === 'desktop'} onClick={() => setWidth('desktop')}><Monitor size={15} /> Desktop</button>
      <button type="button" className="button subtle" aria-pressed={width === 'mobile'} onClick={() => setWidth('mobile')}><Smartphone size={15} /> Mobile</button>
    </div>
    {children}
  </div>
}

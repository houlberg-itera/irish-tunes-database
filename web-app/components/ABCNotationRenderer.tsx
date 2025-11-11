'use client'

import { useEffect, useRef } from 'react'

// Note: abcjs will be imported dynamically since it's a client-side library
let abcjs: any = null

export default function ABCNotationRenderer({ abc }: { abc: string }) {
  const paperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadABCJS = async () => {
      if (!abcjs) {
        abcjs = await import('abcjs')
      }

      if (paperRef.current && abc && abcjs) {
        try {
          abcjs.renderAbc(paperRef.current, abc, {
            responsive: 'resize',
            staffwidth: 740,
            scale: 1,
            paddingleft: 10,
            paddingright: 10,
          })
        } catch (error) {
          console.error('Error rendering ABC notation:', error)
          if (paperRef.current) {
            paperRef.current.innerHTML = '<p class="text-red-600 text-sm">Error rendering ABC notation. Please check your notation syntax.</p>'
          }
        }
      }
    }

    loadABCJS()
  }, [abc])

  return <div ref={paperRef} className="abc-notation-container"></div>
}

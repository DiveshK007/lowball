import { useEffect, useRef } from 'react'

/**
 * Reveals children on scroll entry, once, with a stagger.
 *
 * IntersectionObserver rather than a scroll listener — a scroll handler reflows
 * on every frame and wrecks mobile. Elements start at `.reveal` (translated and
 * transparent) and get `.reveal--in`; the CSS animates transform/opacity only,
 * and honours prefers-reduced-motion by rendering them in place.
 */
export const useReveal = <T extends HTMLElement>(stagger = 90) => {
  const root = useRef<T | null>(null)

  useEffect(() => {
    const node = root.current
    if (!node) return

    const targets = Array.from(node.querySelectorAll<HTMLElement>('.reveal'))
    if (targets.length === 0) return

    // Respect the OS setting without waiting for an intersection.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      targets.forEach((el) => el.classList.add('reveal--in'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries
          .filter((entry) => entry.isIntersecting)
          .forEach((entry, i) => {
            const el = entry.target as HTMLElement
            el.style.transitionDelay = `${i * stagger}ms`
            el.classList.add('reveal--in')
            observer.unobserve(el)
          })
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )

    targets.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [stagger])

  return root
}

import { useEffect, useRef } from 'react'

/** How long an element may stay hidden before we give up and show it. */
const FAILSAFE_MS = 1600

/**
 * Reveals children on scroll entry, once, with a stagger.
 *
 * IntersectionObserver rather than a scroll listener — a scroll handler reflows
 * on every frame and wrecks mobile. Elements start at `.reveal` (translated and
 * transparent) and get `.reveal--in`.
 *
 * Two failure modes have actually shipped here, so both are designed against:
 *
 *   1. A `clip-path` hidden state collapsed the intersection area to zero, so
 *      the observer could never fire (fixed earlier: opacity/transform only).
 *   2. Targets were snapshotted once on mount. Anything rendered later — every
 *      drop card, which only exists after the chain read resolves — was never
 *      observed, and the failsafe iterated the same stale list, so the cards sat
 *      at opacity 0 permanently. A MutationObserver now picks up late arrivals
 *      and the failsafe sweeps the live DOM rather than a snapshot.
 *
 * Invisible content is a far worse bug than a missed animation, so the hidden
 * state is additionally scoped to `[data-reveal-armed]` in CSS: if this hook
 * never runs, nothing is hidden in the first place.
 */
export const useReveal = <T extends HTMLElement>(stagger = 90) => {
  const root = useRef<T | null>(null)

  useEffect(() => {
    const node = root.current
    if (!node) return

    // Arming is what enables the hidden state at all — see the CSS.
    node.setAttribute('data-reveal-armed', '')

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const tracked = new WeakSet<HTMLElement>()
    let batch = 0

    const show = (el: HTMLElement, index = 0) => {
      el.style.transitionDelay = reduced ? '0ms' : `${index * stagger}ms`
      el.classList.add('reveal--in')
    }

    const observer = reduced
      ? null
      : new IntersectionObserver(
          (entries) => {
            entries
              .filter((entry) => entry.isIntersecting)
              .forEach((entry, i) => {
                const el = entry.target as HTMLElement
                show(el, i)
                observer?.unobserve(el)
              })
          },
          // threshold 0: any sliver counts. A higher threshold risks content
          // that never reveals.
          { rootMargin: '0px 0px -5% 0px', threshold: 0 },
        )

    let failsafe = 0
    const armFailsafe = () => {
      window.clearTimeout(failsafe)
      failsafe = window.setTimeout(() => {
        // Sweep the live DOM, not a captured list — late children included.
        node
          .querySelectorAll<HTMLElement>('.reveal:not(.reveal--in)')
          .forEach((el) => show(el))
      }, FAILSAFE_MS)
    }

    const track = (el: HTMLElement) => {
      if (tracked.has(el)) return
      tracked.add(el)
      if (!observer) {
        show(el)
        return
      }
      observer.observe(el)
    }

    const scan = () => {
      const found = node.querySelectorAll<HTMLElement>('.reveal')
      let added = false
      found.forEach((el) => {
        if (!tracked.has(el)) added = true
        track(el)
      })
      // Stagger each batch from zero so a late group animates as its own wave.
      if (added) {
        batch += 1
        armFailsafe()
      }
    }

    scan()

    // Drop cards mount after an async chain read, long after this effect runs.
    const mutations = new MutationObserver(scan)
    mutations.observe(node, { childList: true, subtree: true })

    return () => {
      observer?.disconnect()
      mutations.disconnect()
      window.clearTimeout(failsafe)
      node.removeAttribute('data-reveal-armed')
    }
  }, [stagger])

  return root
}

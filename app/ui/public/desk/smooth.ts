import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

/** Smooth scrolling, driven by GSAP's ticker so every scroll-linked animation stays in step. */
export function initSmooth(): Lenis {
  let lenis = new Lenis({ lerp: 0.1, anchors: { offset: -88 } })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)
  return lenis
}

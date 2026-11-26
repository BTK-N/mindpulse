import Lenis from 'lenis';
import { getGsapWithScrollTrigger } from './gsapConfig';

export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  const nav = navigator as any;
  if (nav.userAgentData && typeof nav.userAgentData.mobile === 'boolean') {
    return nav.userAgentData.mobile;
  }
  const ua = navigator.userAgent || '';
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i.test(ua);
};

export const isReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export interface LenisInstanceResult {
  lenis: Lenis | null;
  cleanup: () => void;
}

export const initLenisDesktop = (): LenisInstanceResult => {
  if (typeof window === 'undefined' || isMobileDevice() || isReducedMotion()) {
    return { lenis: null, cleanup: () => {} };
  }

  const { gsap, ScrollTrigger } = getGsapWithScrollTrigger();

  const lenis = new Lenis({
    lerp: 0.08,
    smoothWheel: true,
    wheelMultiplier: 0.9,
  });

  const onScroll = () => {
    ScrollTrigger.update();
  };
  lenis.on('scroll', onScroll);

  const tickerCallback = (time: number) => {
    lenis.raf(time * 1000);
  };
  gsap.ticker.add(tickerCallback);
  gsap.ticker.lagSmoothing(0);

  const onLoad = () => {
    ScrollTrigger.refresh();
  };
  if (document.readyState === 'complete') {
    ScrollTrigger.refresh();
  } else {
    window.addEventListener('load', onLoad);
  }

  const cleanup = () => {
    window.removeEventListener('load', onLoad);
    gsap.ticker.remove(tickerCallback);
    lenis.off('scroll', onScroll);
    lenis.destroy();
  };

  return { lenis, cleanup };
};

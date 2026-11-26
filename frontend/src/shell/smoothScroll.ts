let lenisInstance: any = null;
let tickerFn: ((time: number) => void) | null = null;
let currentOp: Promise<any> = Promise.resolve();
let rafCount = 0;

export const isReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const initSmoothScroll = (): Promise<any> => {
  currentOp = currentOp.then(async () => {
    if (typeof window === 'undefined') return null;

    const isMobile = window.matchMedia('(pointer: coarse)').matches && window.innerWidth < 1024;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || isMobile) {
      return null; // no Lenis, use native scroll
    }
    if (lenisInstance) {
      return lenisInstance;
    }

    try {
      const [{ default: Lenis }, { getGsapWithScrollTrigger }] = await Promise.all([
        import('lenis'),
        import('../landing/gsapConfig'),
      ]);

      const { gsap, ScrollTrigger } = getGsapWithScrollTrigger();

      const lenis = new Lenis({
        autoRaf: false,
        lerp: 0.1,
        smoothWheel: true,
        wheelMultiplier: 1.0,
        touchMultiplier: 1.0,
        syncTouch: false,
      });

      lenis.on('scroll', ScrollTrigger.update);

      rafCount = 0;
      tickerFn = (time: number) => {
        rafCount++;
        lenis.raf(time * 1000);
      };

      gsap.ticker.add(tickerFn);
      gsap.ticker.lagSmoothing(0);

      if (typeof window !== 'undefined') {
        (window as any).__lenis = lenis;
        (window as any).__getRafCount = () => rafCount;
        (window as any).__resetRafCount = () => { rafCount = 0; };
      }

      lenisInstance = lenis;
      return lenis;
    } catch (err) {
      console.error('Failed to initialize Lenis:', err);
      return null;
    }
  });

  return currentOp;
};

export const destroySmoothScroll = (): Promise<any> => {
  currentOp = currentOp.then(async () => {
    if (tickerFn) {
      try {
        const { getGsapWithScrollTrigger } = await import('../landing/gsapConfig');
        const { gsap } = getGsapWithScrollTrigger();
        gsap.ticker.remove(tickerFn);
      } catch {}
      tickerFn = null;
    }
    if (lenisInstance) {
      try {
        lenisInstance.destroy();
      } catch {}
      lenisInstance = null;
    }
  });

  return currentOp;
};

export const scrollLenisToTop = async (immediate = true) => {
  await currentOp;
  if (lenisInstance) {
    lenisInstance.scrollTo(0, { immediate });
  } else if (typeof window !== 'undefined') {
    window.scrollTo(0, 0);
  }
  if (typeof window !== 'undefined') {
    requestAnimationFrame(async () => {
      try {
        const { getGsapWithScrollTrigger } = await import('../landing/gsapConfig');
        const { ScrollTrigger } = getGsapWithScrollTrigger();
        ScrollTrigger.refresh();
      } catch {}
    });
  }
};

export const getLenis = () => lenisInstance;


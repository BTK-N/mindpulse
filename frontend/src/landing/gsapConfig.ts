import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let isRegistered = false;

export const getGsapWithScrollTrigger = () => {
  if (!isRegistered && typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
    (window as any).ScrollTrigger = ScrollTrigger;
    isRegistered = true;
  }
  return { gsap, ScrollTrigger };
};

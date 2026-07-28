import gsap from 'gsap';

class MouseInfoCard
{
  container: HTMLElement;
  header: HTMLElement;
  body: HTMLElement;
  private enabled: boolean;

  constructor()
  {
    const container = document.querySelector('.mouse_info_card');

    // typescript needs it
    if (!(container instanceof HTMLElement)){
      throw new Error('Missing .mouse_info_card element');
    }

    const header = container.querySelector('.mouse_info_card__header');
    const body = container.querySelector('.mouse_info_card__body');

    // typescript needs it
    if (!(header instanceof HTMLElement) || !(body instanceof HTMLElement)) {
      throw new Error('Missing mouse info card header or body element');
    }

    this.container = container;
    this.header = header;
    this.body = body;
    this.enabled = this.detectDesktopHoverCapability();

    if (!this.enabled) {
      this.hide();
    }
  }

  private detectDesktopHoverCapability(): boolean
  {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return true;
    }

    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  }

  hide()
  {
    this.hideBubble(this.container);
  }

  show(header: string, body: string, variant: 'route' | 'city' = 'route', x: number, y: number)
  {
    if (!this.enabled) return;

    this.container.classList.toggle('mouse_info_card--city', variant === 'city');
    this.container.classList.toggle('mouse_info_card--route', variant === 'route');
    this.header.classList.toggle('mouse_info_card__header--city', variant === 'city');
    this.header.classList.toggle('mouse_info_card__header--route', variant === 'route');
    this.body.classList.toggle('mouse_info_card__body--city', variant === 'city');
    this.body.classList.toggle('mouse_info_card__body--route', variant === 'route');
    this.header.textContent = header;
    this.body.textContent = body;

    this.showBubble(this.container, x, y);
  }

  moveTo(x: number, y: number)
  {
    if (!this.enabled) return;
    gsap.set(this.container, { x, y });
  }

  showBubble(bubbleEl: HTMLElement, x: number, y: number) {
    gsap.set(bubbleEl, { x, y });
    gsap.timeline()
      .fromTo(bubbleEl,
        { opacity: 0, scaleX: 0.5, scaleY: 0.3 },
        { opacity: 1, scaleX: 1.1, scaleY: 0.9, duration: 0.15, ease: "power1.out" }
      )
      .to(bubbleEl, { scaleX: 1, scaleY: 1, duration: 0.15, ease: "power1.out" });
    // gsap.fromTo(bubbleEl,
    //   {
    //     opacity: 0,
    //     scale: 0.3,
    //     transformOrigin: "0% 0%"
    //   },
    //   {
    //     opacity: 1,
    //     scale: 1,
    //     duration: 0.35,
    //     ease: "back.out(1.7)"
    //   }
    // );
  }

  hideBubble(bubbleEl: HTMLElement  ) {
    gsap.killTweensOf(bubbleEl);
    gsap.to(bubbleEl, {
      opacity: 0,
      scale: 0.3,
      duration: 0.2,
      ease: "power2.in"
    });
  }
}

export { MouseInfoCard };

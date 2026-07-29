import { GsapManager } from './app/GsapManager';

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
    GsapManager.hideBubble(this.container);
  }

  private sanitizeRouteNumber(routeNumber: string): string {
      return routeNumber.replace(/([A-Za-z]+)(\d+)/g, '$1 $2');
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
    this.header.textContent = variant === 'route' ? this.sanitizeRouteNumber(header) : header;
    this.body.textContent = body;

    GsapManager.showBubble(this.container, x, y);
  }

  moveTo(x: number, y: number)
  {
    if (!this.enabled) return;
    GsapManager.moveTo(this.container, x, y);
  }
}

export { MouseInfoCard };

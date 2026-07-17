class MouseInfoCard
{
  container: HTMLElement;
  header: HTMLElement;
  body: HTMLElement;
  private offsetX: number;
  private offsetY: number;

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
    this.offsetX = 18;
    this.offsetY = 18;
  }

  hide()
  {
    this.container.classList.add('hidden');
  }

  show(header: string, body: string)
  {
    this.header.textContent = header;
    this.body.textContent = body;
    this.container.classList.remove('hidden');
  }

  moveTo(x: number, y: number)
  {
    this.container.style.transform = `translate(${x + this.offsetX}px, ${y + this.offsetY}px)`;
  }
}

export { MouseInfoCard };

import { Component, HostListener, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-whatsapp-chat',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="niz-whatsapp-floating-container">
      <button
        type="button"
        class="niz-whatsapp-btn"
        [class.niz-whatsapp-btn--mobile]="viewport() === 'mobile'"
        [style.opacity]="isHovered() ? '0.9' : '1'"
        [style.transform]="isPressed() ? 'translateY(0px)' : 'translateY(-1px)'"
        (mouseenter)="isHovered.set(true)"
        (mouseleave)="isHovered.set(false); isPressed.set(false)"
        (mousedown)="isPressed.set(true)"
        (mouseup)="isPressed.set(false)"
        (click)="openWhatsApp()"
        aria-label="Chat on WhatsApp"
      >
        <svg
          [attr.width]="viewport() === 'mobile' ? 16 : 20"
          [attr.height]="viewport() === 'mobile' ? 16 : 20"
          viewBox="0 0 24 24"
          fill="currentColor"
          style="flex-shrink: 0"
        >
          <path
            d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.488"
          />
        </svg>
        <span>{{ buttonText }}</span>
      </button>
    </div>
  `,
  styles: [
    `
      .niz-whatsapp-floating-container {
        position: fixed;
        right: 20px;
        bottom: 20px;
        z-index: 2147483000;
        pointer-events: auto;
      }
      .niz-whatsapp-btn {
        background-color: var(--token-2d3de992-80f6-43cc-b5d5-16857da63015, rgb(23, 23, 255));
        color: rgb(255, 255, 255);
        border-radius: 50px;
        border: none;
        padding: 12px 20px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 8px;
        transition: all 0.2s ease;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        font-family: 'Inter', sans-serif;
        font-style: normal;
        font-weight: 600;
        font-size: 16px;
        letter-spacing: -0.01em;
        line-height: 1em;
        min-width: max-content;
      }
      .niz-whatsapp-btn--mobile {
        padding: 8px 16px;
        gap: 6px;
        font-size: 14px;
      }
    `,
  ],
})
export class WhatsappChatComponent {
  @Input() phoneNumber = '+11992531454';
  @Input() message = 'Olá! Estou Interessado nos serviços.';
  @Input() buttonText = 'Chat on WhatsApp';

  readonly isHovered = signal(false);
  readonly isPressed = signal(false);
  readonly viewport = signal<'mobile' | 'tablet' | 'desktop'>('desktop');

  constructor() {
    this.updateViewport();
  }

  @HostListener('window:resize')
  updateViewport(): void {
    if (typeof window === 'undefined') return;
    const w = window.innerWidth;
    this.viewport.set(w < 768 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop');
  }

  openWhatsApp(): void {
    const cleanPhone = this.phoneNumber.replace(/[^\d+]/g, '');
    const encoded = encodeURIComponent(this.message);
    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
  }
}

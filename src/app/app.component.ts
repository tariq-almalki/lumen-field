import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, QueryList, ViewChildren } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SignalFieldComponent } from './signal-field.component';

interface FieldNote {
  index: string;
  title: string;
  location: string;
  date: string;
  body: string;
  className: string;
  accent: string;
}

@Component({
  selector: 'lf-root',
  standalone: true,
  imports: [CommonModule, SignalFieldComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements AfterViewInit, OnDestroy {
  @ViewChildren('reveal') private readonly revealItems!: QueryList<ElementRef<HTMLElement>>;

  menuOpen = false;
  formSent = false;
  private revealObserver?: IntersectionObserver;

  readonly fieldNotes: FieldNote[] = [
    {
      index: '01',
      title: 'Salt lines',
      location: 'Qeshm / 26° 57′ N',
      date: '04.2024',
      body: 'A white mineral edge where the tide leaves its handwriting behind.',
      className: 'study study--salt',
      accent: 'salt'
    },
    {
      index: '02',
      title: 'After image',
      location: 'Salar / 38° 55′ N',
      date: '10.2023',
      body: 'Heat holds the memory of a body long after it has left the frame.',
      className: 'study study--after',
      accent: 'after'
    },
    {
      index: '03',
      title: 'Low weather',
      location: 'Aqaba / 29° 31′ N',
      date: '01.2024',
      body: 'A blue hour observed from the wrong side of the horizon.',
      className: 'study study--weather',
      accent: 'weather'
    }
  ];

  ngAfterViewInit(): void {
    if (!('IntersectionObserver' in window)) {
      this.revealItems.forEach((item) => item.nativeElement.classList.add('is-visible'));
      return;
    }
    this.revealObserver = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          this.revealObserver?.unobserve(entry.target);
        }
      }),
      { threshold: 0.14 }
    );
    this.revealItems.forEach((item) => this.revealObserver?.observe(item.nativeElement));
  }

  ngOnDestroy(): void {
    this.revealObserver?.disconnect();
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  joinDispatch(event: Event): void {
    event.preventDefault();
    this.formSent = true;
  }
}

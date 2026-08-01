import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, QueryList, ViewChildren } from '@angular/core';
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

type Theme = 'dark' | 'light';

@Component({
  selector: 'lf-root',
  standalone: true,
  imports: [CommonModule, SignalFieldComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChildren('reveal') private readonly revealItems!: QueryList<ElementRef<HTMLElement>>;

  menuOpen = false;
  formSent = false;
  theme: Theme = 'dark';
  private revealObserver?: IntersectionObserver;
  private themeMediaQuery?: MediaQueryList;
  private readonly themeStorageKey = 'lumen-field-theme';

  constructor(private readonly changeDetector: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.initializeTheme();
  }

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
    this.themeMediaQuery?.removeEventListener('change', this.handleSystemThemeChange);
  }

  toggleTheme(): void {
    this.setTheme(this.theme === 'dark' ? 'light' : 'dark', true);
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

  private initializeTheme(): void {
    this.themeMediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const storedTheme = this.readStoredTheme();
    this.setTheme(storedTheme ?? (this.themeMediaQuery.matches ? 'light' : 'dark'), false);
    this.themeMediaQuery.addEventListener('change', this.handleSystemThemeChange);
  }

  private readonly handleSystemThemeChange = (event: MediaQueryListEvent): void => {
    if (!this.readStoredTheme()) {
      this.setTheme(event.matches ? 'light' : 'dark', false);
      this.changeDetector.markForCheck();
    }
  };

  private setTheme(theme: Theme, persist: boolean): void {
    this.theme = theme;
    document.documentElement.dataset['theme'] = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f4f1e8' : '#0b1014');
    if (persist) {
      try {
        window.localStorage.setItem(this.themeStorageKey, theme);
      } catch {
        // Storage can be unavailable in privacy-restricted contexts.
      }
    }
  }

  private readStoredTheme(): Theme | undefined {
    try {
      const storedTheme = window.localStorage.getItem(this.themeStorageKey);
      return storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : undefined;
    } catch {
      return undefined;
    }
  }
}

import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
  AfterViewInit,
  OnDestroy,
  Renderer2,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavToolbarComponent } from './nav-toolbar/nav-toolbar.component.js';
import { TerminalComponent } from './components/terminal/terminal.component.js';
import { BottomBarComponent, ViewMode } from './bottom-bar/bottom-bar.component.js';
import { IframeViewComponent } from './components/iframe-view/iframe-view.component.js';
import { UiPreferencesService, Theme } from './services/ui-preferences.service.js';
import { LocalConfigService } from './services/local-config.service.js';

/**
 * Application Host — a stripped-down nexus-console derivative.
 *
 * Keeps ONLY: the left nav toolbar (all buttons as-is), the address bar,
 * the terminal (console pane), and the bottom status bar. Buttons that show
 * an iframe render the iframe in the content pane; all other buttons render
 * an empty content pane.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    NavToolbarComponent,
    TerminalComponent,
    BottomBarComponent,
    IframeViewComponent,
  ],
  host: {
    '(document:keydown)': 'onKeyDown($event)',
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  private uiPreferencesService = inject(UiPreferencesService);
  private localConfigService = inject(LocalConfigService);
  private renderer = inject(Renderer2);
  private elementRef = inject(ElementRef);

  /** Current view mode — drives the content pane (iframe or empty). */
  currentViewMode = signal<ViewMode>('file-explorer');

  /** URL for each iframe-capable view mode. */
  viewModeUrls: Record<string, string> = {
    'conduit-ui': 'http://localhost:4201',
    'duality': 'http://localhost:3002',
    'plurality': 'http://localhost:3004',
    'assembly': 'http://localhost:4214',
    'nebula-rms': 'http://localhost:4210',
    'peb-ui': 'http://localhost:4206',
    'kernel-ui': 'http://localhost:4207',
    'tackle-ui': 'http://localhost:4202',
    'cascade-ui': 'http://localhost:4203',
    'execution-ui': 'http://localhost:4205',
    'vision-ui': 'http://localhost:4208',
    'wind-ui': 'http://localhost:4209',
    'nebula-cp': 'http://localhost:4014',
    'semantics-ui': 'http://localhost:4213',
    'throttler-ui': 'http://localhost:4211',
    'barbie': 'http://localhost:3010',
    'monaco-judge': 'http://localhost:4016',
    'conduit-legacy-ui': 'http://localhost:4015',
    'data-explorer': 'http://localhost:4212',
  };

  /** View modes that render an iframe in the content pane. */
  isIframeMode = computed(() => {
    const mode = this.currentViewMode();
    return mode !== 'file-explorer' && mode !== 'service-mesh' && mode !== 'kanban';
  });

  /** URL for the current iframe mode (or null when not an iframe mode). */
  currentIframeUrl = computed(() => {
    const mode = this.currentViewMode();
    return this.viewModeUrls[mode] ?? null;
  });

  /** Address bar content: current iframe URL, or the session name for non-iframe modes. */
  addressBarText = computed(() => {
    const url = this.currentIframeUrl();
    return url ?? this.localConfigService.sessionName();
  });

  /** Left nav collapsed state — persisted via UiPreferencesService. */
  isNavCollapsed = this.uiPreferencesService.isNavCollapsed;

  /** Terminal / console state. */
  isConsoleCollapsed = this.uiPreferencesService.isConsoleCollapsed;
  isTerminalMaximized = signal(false);
  consolePaneHeight = signal(200); // px — synced from persisted % in ngAfterViewInit
  private isResizingConsole = false;
  private unlistenConsoleResizeMove: (() => void) | null = null;
  private unlistenConsoleResizeUp: (() => void) | null = null;

  /** Status bar text. */
  statusBarSelectionInfo = signal('Ready');

  /** Default image server URL for the bottom-bar site icons. */
  defaultImageUrl = computed(() => this.localConfigService.defaultImageUrl());

  /** Hamburger menu state and current theme signal. */
  isMenuOpen = signal(false);
  currentTheme = this.uiPreferencesService.theme;

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    // Restore persisted console height percentage.
    const pct = this.uiPreferencesService.explorerConsoleHeight() ?? 20;
    if (pct > 0) {
      const height = this.elementRef.nativeElement.getBoundingClientRect().height || 800;
      this.consolePaneHeight.set(Math.round((pct / 100) * height));
    }
  }

  ngOnDestroy(): void {
    this.stopConsoleResize();
  }

  // ── Hamburger Menu & Theme Selection ───────────────────────────
  toggleMenu(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.isMenuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  selectTheme(theme: Theme): void {
    this.uiPreferencesService.setTheme(theme);
  }

  themeDisplayName(theme: Theme): string {
    switch (theme) {
      case 'theme-light':
        return 'Light';
      case 'theme-steel':
        return 'Steel';
      case 'theme-dark':
        return 'Dark';
      default:
        return 'Steel';
    }
  }

  // ── Nav toolbar ────────────────────────────────────────────────
  onNavCollapseToggle(): void {
    this.uiPreferencesService.toggleNavCollapse();
  }

  // ── Console / Terminal ─────────────────────────────────────────
  toggleConsole(): void {
    this.uiPreferencesService.toggleConsole();
  }

  toggleMaximize(): void {
    this.isTerminalMaximized.update((v) => !v);
  }

  startConsolePaneResize(event: MouseEvent): void {
    event.preventDefault();
    this.isResizingConsole = true;
    const startY = event.clientY;
    const startHeight = this.consolePaneHeight();
    const container = this.elementRef.nativeElement as HTMLElement;

    this.unlistenConsoleResizeMove = this.renderer.listen('document', 'mousemove', (e: MouseEvent) => {
      if (!this.isResizingConsole) return;
      const delta = startY - e.clientY;
      const newHeight = Math.min(Math.max(startHeight + delta, 60), container.getBoundingClientRect().height * 0.8);
      this.consolePaneHeight.set(newHeight);
    });
    this.unlistenConsoleResizeUp = this.renderer.listen('document', 'mouseup', () => {
      this.stopConsoleResize();
      const h = container.getBoundingClientRect().height || 800;
      this.uiPreferencesService.setExplorerConsoleHeight((this.consolePaneHeight() / h) * 100);
    });
  }

  private stopConsoleResize(): void {
    this.isResizingConsole = false;
    this.unlistenConsoleResizeMove?.();
    this.unlistenConsoleResizeUp?.();
    this.unlistenConsoleResizeMove = null;
    this.unlistenConsoleResizeUp = null;
  }

  // ── Status bar / bottom bar ────────────────────────────────────
  onAiconfigClick(): void {
    // AI configuration popup is out of scope for the host shell.
  }

  // ── Host handlers ──────────────────────────────────────────────
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.isMenuOpen()) {
      this.closeMenu();
    }
  }

  onDocumentClick(event: MouseEvent): void {
    if (!this.isMenuOpen()) {
      return;
    }
    const target = event.target as HTMLElement | null;
    if (target && !target.closest('#top-bar-menu-container')) {
      this.closeMenu();
    }
  }
}
import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore } from '../stores/themeStore';

describe('themeStore', () => {
  beforeEach(() => {
    // Reset store state between tests
    useThemeStore.setState({
      theme: 'system',
      resolvedTheme: 'light',
      sidebarCollapsed: false,
    });
  });

  it('has correct default state', () => {
    const state = useThemeStore.getState();
    expect(state.theme).toBe('system');
    expect(state.sidebarCollapsed).toBe(false);
  });

  it('setTheme updates theme and resolvedTheme', () => {
    useThemeStore.getState().setTheme('dark');
    const state = useThemeStore.getState();
    expect(state.theme).toBe('dark');
    expect(state.resolvedTheme).toBe('dark');
  });

  it('toggleTheme flips between light and dark', () => {
    useThemeStore.getState().setTheme('light');
    expect(useThemeStore.getState().resolvedTheme).toBe('light');

    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().resolvedTheme).toBe('dark');
  });

  it('toggleSidebar flips collapsed state', () => {
    expect(useThemeStore.getState().sidebarCollapsed).toBe(false);
    useThemeStore.getState().toggleSidebar();
    expect(useThemeStore.getState().sidebarCollapsed).toBe(true);
    useThemeStore.getState().toggleSidebar();
    expect(useThemeStore.getState().sidebarCollapsed).toBe(false);
  });

  it('setSidebarCollapsed sets explicit value', () => {
    useThemeStore.getState().setSidebarCollapsed(true);
    expect(useThemeStore.getState().sidebarCollapsed).toBe(true);
    useThemeStore.getState().setSidebarCollapsed(false);
    expect(useThemeStore.getState().sidebarCollapsed).toBe(false);
  });
});

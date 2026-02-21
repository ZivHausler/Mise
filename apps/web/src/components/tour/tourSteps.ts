import type { Step } from 'react-joyride';
import type { TFunction } from 'i18next';

export function getDesktopTourSteps(t: TFunction, dir: 'ltr' | 'rtl'): Step[] {
  const sidebarPlacement = dir === 'rtl' ? 'left' : 'right';

  return [
    {
      target: '[data-tour="sidebar-dashboard"]',
      title: t('tour.steps.dashboard.title'),
      content: t('tour.steps.dashboard.content'),
      placement: sidebarPlacement,
      disableBeacon: true,
      data: { path: '/' },
    },
    {
      target: '[data-tour="sidebar-inventory"]',
      title: t('tour.steps.inventory.title'),
      content: t('tour.steps.inventory.content'),
      placement: sidebarPlacement,
      data: { path: '/inventory' },
    },
    {
      target: '[data-tour="sidebar-recipes"]',
      title: t('tour.steps.recipes.title'),
      content: t('tour.steps.recipes.content'),
      placement: sidebarPlacement,
      data: { path: '/recipes' },
    },
    {
      target: '[data-tour="sidebar-customers"]',
      title: t('tour.steps.customers.title'),
      content: t('tour.steps.customers.content'),
      placement: sidebarPlacement,
      data: { path: '/customers' },
    },
    {
      target: '[data-tour="sidebar-orders"]',
      title: t('tour.steps.orders.title'),
      content: t('tour.steps.orders.content'),
      placement: sidebarPlacement,
      data: { path: '/orders' },
    },
    {
      target: '[data-tour="sidebar-payments"]',
      title: t('tour.steps.payments.title'),
      content: t('tour.steps.payments.content'),
      placement: sidebarPlacement,
      data: { path: '/payments' },
    },
    {
      target: '[data-tour="sidebar-settings"]',
      title: t('tour.steps.settings.title'),
      content: t('tour.steps.settings.content'),
      placement: 'top',
      data: { path: '/settings' },
    },
    {
      target: '[data-tour="topbar-language"]',
      title: t('tour.steps.language.title'),
      content: t('tour.steps.language.content'),
      placement: 'bottom',
    },
  ];
}

export function getMobileTourSteps(t: TFunction): Step[] {
  return [
    {
      target: '[data-tour="topbar-language"]',
      title: t('tour.steps.language.title'),
      content: t('tour.steps.language.content'),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="bottomtab-dashboard"]',
      title: t('tour.steps.dashboard.title'),
      content: t('tour.steps.dashboard.content'),
      placement: 'top',
      data: { path: '/' },
    },
    {
      target: '[data-tour="bottomtab-inventory"]',
      title: t('tour.steps.inventory.title'),
      content: t('tour.steps.inventory.content'),
      placement: 'top',
      data: { path: '/inventory' },
    },
    {
      target: '[data-tour="bottomtab-recipes"]',
      title: t('tour.steps.recipes.title'),
      content: t('tour.steps.recipes.content'),
      placement: 'top',
      data: { path: '/recipes' },
    },
    {
      target: '[data-tour="bottomtab-orders"]',
      title: t('tour.steps.orders.title'),
      content: t('tour.steps.orders.content'),
      placement: 'top',
      data: { path: '/orders' },
    },
    {
      target: '[data-tour="bottomtab-more"]',
      title: t('tour.steps.more.title'),
      content: t('tour.steps.more.content'),
      placement: 'top',
      data: { path: '/more' },
    },
  ];
}

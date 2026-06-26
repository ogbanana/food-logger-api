let inAppNavigations = 0;

export function markNavigation(): void {
  inAppNavigations += 1;
}

export function hasInAppHistory(): boolean {
  return inAppNavigations > 0;
}

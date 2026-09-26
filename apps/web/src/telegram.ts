export function getTelegramInitData(): string | null {
  const webApp = (window as any).Telegram?.WebApp;
  if (webApp?.initData) {
    webApp.ready();
    webApp.expand();
    return webApp.initData as string;
  }
  return null;
}

export function isInsideTelegram(): boolean {
  return Boolean((window as any).Telegram?.WebApp?.initData);
}

export class RedirectSignal extends Error {
  constructor(public to: string) {
    super(`redirect:${to}`);
    this.name = 'RedirectSignal';
  }
}

export function redirect(to: string): never {
  throw new RedirectSignal(to);
}

export function notFound(): never {
  throw new Error('notFound');
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function errorMessage(err: unknown, fallback = 'Đã có lỗi xảy ra'): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

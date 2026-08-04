import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ServiceWorkerRegistration } from '@/shared/ui/service-worker-registration';

describe('ServiceWorkerRegistration', () => {
  it('registers /sw.js on mount', () => {
    const register = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register },
      configurable: true,
    });

    render(<ServiceWorkerRegistration />);

    expect(register).toHaveBeenCalledWith('/sw.js');
  });
});

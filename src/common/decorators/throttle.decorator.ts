import { Throttle } from '@nestjs/throttler';

export const ThrottleRoute = (limit: number, ttl: number) =>
  Throttle({
    default: {
      limit,
      ttl,
    },
  });

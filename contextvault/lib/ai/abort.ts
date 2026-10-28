/** Bound provider calls while allowing the request's cancellation to propagate. */
export function providerSignal(timeoutMs:number, signal?:AbortSignal):AbortSignal {
  signal?.throwIfAborted();
  const timeout=AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal,timeout]) : timeout;
}

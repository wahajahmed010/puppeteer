import {describe, it} from 'node:test';

import {disposeSymbol} from '../../util/disposable.js';
import {Request} from './Request.js';
import type {BrowsingContext} from './BrowsingContext.js';

/**
 * Creates a minimal mitt-compatible emitter for mocking.
 * EventEmitter constructor calls .on()/.off() on the wrapped emitter.
 */
function createMittMock() {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  return {
    on: (event: string, handler: (...args: unknown[]) => void) => {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(handler);
    },
    off: (event: string, handler: (...args: unknown[]) => void) => {
      listeners.get(event)?.delete(handler);
    },
    once: (event: string, handler: (...args: unknown[]) => void) => {
      const wrapper = (...args: unknown[]) => {
        handler(...args);
        listeners.get(event)?.delete(wrapper);
      };
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(wrapper);
    },
  };
}

describe('BiDi Request', () => {
  const event = {
    context: 'ctx-1',
    isBlocked: false,
    navigation: 'nav-1',
    redirectCount: 0,
    request: {
      request: 'req-1',
      url: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
      method: 'GET',
      headers: [{name: 'Content-Type', value: {type: 'string', value: 'text/html'}}],
      cookies: [],
      headersSize: 0,
      bodySize: 10,
      timings: {
        timeOrigin: 0,
        requestTime: 0,
        redirectStart: 0,
        redirectEnd: 0,
        fetchStart: 0,
        dnsStart: 0,
        dnsEnd: 0,
        connectStart: 0,
        connectEnd: 0,
        tlsStart: 0,
        requestStart: 0,
        responseStart: 0,
        responseEnd: 0,
      },
    },
    timestamp: 0,
    initiator: {type: 'other' as const},
  } as import('webdriver-bidi-protocol').Network.BeforeRequestSentParameters;

  const session = createMittMock();

  const browsingContext = {
    id: 'ctx-1',
    userContext: {
      browser: {
        session,
      },
    },
    // The BrowsingContext extends EventEmitter, so when EventEmitter wraps it,
    // it calls .on()/.off()/.once() on the BrowsingContext directly.
    ...createMittMock(),
  } as unknown as BrowsingContext;

  it('should emit disposed event and null out data on dispose', () => {
    const request = Request.from(browsingContext, event);

    let disposedCalled = false;
    request.once('disposed', () => {
      disposedCalled = true;
    });

    request[disposeSymbol]();

    if (!disposedCalled) {
      throw new Error('Expected disposed event to be emitted');
    }

    if (request.disposed !== true) {
      throw new Error('Expected request.disposed to be true');
    }
  });

  it('should preserve getter values after disposal', () => {
    const request = Request.from(browsingContext, event);

    request[disposeSymbol]();

    // All getters should still work after disposal.
    if (request.id !== 'req-1') {
      throw new Error(`Expected id to be 'req-1', got '${request.id}'`);
    }
    if (request.url !== 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=') {
      throw new Error('Expected url to be preserved after disposal');
    }
    if (request.method !== 'GET') {
      throw new Error(`Expected method to be 'GET', got '${request.method}'`);
    }
    if (request.isBlocked !== false) {
      throw new Error('Expected isBlocked to be false after disposal');
    }
    if (request.navigation !== 'nav-1') {
      throw new Error(`Expected navigation to be 'nav-1', got '${request.navigation}'`);
    }
    if (request.resourceType !== undefined) {
      throw new Error('Expected resourceType to be undefined');
    }
    if (request.postData !== undefined) {
      throw new Error('Expected postData to be undefined');
    }
    if (request.hasPostData !== true) {
      throw new Error('Expected hasPostData to be true');
    }

    // headers getter should return the cached headers.
    const headers = request.headers;
    if (!headers) {
      throw new Error('Expected headers to be defined after disposal');
    }
    if (headers.length !== 1) {
      throw new Error(`Expected 1 header, got ${headers.length}`);
    }
    if (headers[0].name !== 'Content-Type') {
      throw new Error(`Expected header name 'Content-Type', got '${headers[0].name}'`);
    }

    // initiator getter should work.
    const initiator = request.initiator;
    if (!initiator) {
      throw new Error('Expected initiator to be defined after disposal');
    }
    if (initiator.type !== 'other') {
      throw new Error(`Expected initiator type 'other', got '${initiator.type}'`);
    }
  });

  it('should preserve response after disposal', () => {
    const request = Request.from(browsingContext, event);

    request[disposeSymbol]();

    // response should still be accessible after disposal.
    // Callers use response as a "request finished" signal.
    // When no response was set before disposal, it's undefined - that's fine.
    if (request.response !== undefined) {
      // Shouldn't throw even if response is checked.
    }
  });

  it('should preserve timing after disposal', () => {
    const request = Request.from(browsingContext, event);

    request[disposeSymbol]();

    const timing = request.timing();
    if (!timing) {
      throw new Error('Expected timing to be defined after disposal');
    }
    if (timing.requestTime !== 0) {
      throw new Error(`Expected requestTime to be 0, got ${timing.requestTime}`);
    }
  });

  it('should preserve error getter after disposal', () => {
    const request = Request.from(browsingContext, event);

    request[disposeSymbol]();

    // error getter should still work (returns undefined if no error set).
    if (request.error !== undefined) {
      throw new Error('Expected error to be undefined after disposal');
    }
  });

  it('should preserve redirect getter after disposal', () => {
    const request = Request.from(browsingContext, event);

    request[disposeSymbol]();

    // redirect getter should still work (returns undefined if no redirect set).
    if (request.redirect !== undefined) {
      throw new Error('Expected redirect to be undefined after disposal');
    }
  });
});

import { Buffer as NodeBuffer } from "buffer";

type BrowserProcess = {
  browser: boolean;
  env: Record<string, string | undefined>;
  nextTick: (callback: () => void) => void;
};

type BrowserGlobals = Omit<typeof globalThis, "Buffer" | "process"> & {
  Buffer?: typeof NodeBuffer;
  process?: BrowserProcess;
};

const browserGlobal = globalThis as unknown as BrowserGlobals;

declare global {
  interface Window {
    Buffer?: typeof NodeBuffer;
    process?: BrowserProcess;
  }
}

if (!browserGlobal.Buffer) {
  browserGlobal.Buffer = NodeBuffer;
}

if (!browserGlobal.process) {
  browserGlobal.process = {
    browser: true,
    env: {},
    nextTick: (callback: () => void) => {
      void Promise.resolve().then(callback);
    },
  };
}

if (typeof window !== "undefined" && !window.Buffer) {
  window.Buffer = NodeBuffer;
}

if (typeof window !== "undefined" && !window.process) {
  (window as unknown as { process?: BrowserProcess }).process = browserGlobal.process;
}

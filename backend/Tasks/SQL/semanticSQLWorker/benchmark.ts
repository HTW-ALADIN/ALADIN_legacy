import 'reflect-metadata'
import { performance } from 'perf_hooks';

// Create a key to store the metadata under. Preferably it's symbol.
const functionRuntimes = Symbol('runtimes')

/**
 * Decorator that measures the runtime of a function and attaches the time with a custom message to the metadata.
 * @param message string
 * @returns Any wrapped function
 */
export const attachRuntimes = (message: string) => {
  return function (target: any, name: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: Array<any>) {
      const startTime = performance.now();      
      const result = await method.apply(this, args);
      const endTime = performance.now();
      const elapsed = Math.round(endTime - startTime);

      const runtimes = [...getFunctionRuntimes(descriptor.value), elapsed]
      Reflect.defineMetadata(functionRuntimes, runtimes, descriptor.value);

      return result;
    };
  };
}

// Get the time runs from the metadata.
export const getFunctionRuntimes = (fn: (...args: unknown[]) => unknown): Array<number> | undefined => {
    let runtimes = [];
    if (Reflect.hasMetadata(functionRuntimes, fn)) {
        runtimes = Reflect.getMetadata(functionRuntimes, fn);
    } 
    return runtimes;
}
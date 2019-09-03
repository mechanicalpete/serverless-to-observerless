import { } from 'jest';
import { logger } from '../src/logging';

// Turn off logging
logger.level = 'OFF';

jest.setTimeout(30000);
jest.mock('aws-xray-sdk', () => {
  return {
    captureAWS(module: any): any { return require('aws-sdk') },
    getSegment(): any {
      return {
        addNewSubsegment(name: string): any {
          return {
            close(): void { },
            addError(error: Error): void { },
            addAnnotation(id: any, value: any): void { },
          }
        },
        close(): void { },
      }
    },
  }
});


import { marked as markedType } from 'marked';

declare global {
  interface Window {
    marked: typeof markedType;
  }
}

export {};

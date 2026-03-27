import { Buffer } from 'buffer';
import process from 'process';

globalThis.Buffer = Buffer;
window.Buffer = Buffer;
globalThis.process = process;
window.process = process;

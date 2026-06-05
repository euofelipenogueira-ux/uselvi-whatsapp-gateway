import fs from 'fs';
import path from 'path';
import { createLogger } from './logger';

const logger = createLogger('FileManager');

export function ensureDirectoryExists(dirPath: string): void {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      logger.info(`Directory created: ${dirPath}`);
    }
  } catch (error) {
    logger.error(`Failed to ensure directory exists: ${dirPath}`, error);
    throw error;
  }
}

export function deleteDirectory(dirPath: string): void {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
      logger.info(`Directory deleted: ${dirPath}`);
    }
  } catch (error) {
    logger.error(`Failed to delete directory: ${dirPath}`, error);
    throw error;
  }
}

export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

export function readFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    logger.error(`Failed to read file: ${filePath}`, error);
    throw error;
  }
}

export function writeFile(filePath: string, content: string): void {
  try {
    const dir = path.dirname(filePath);
    ensureDirectoryExists(dir);
    fs.writeFileSync(filePath, content, 'utf-8');
    logger.info(`File written: ${filePath}`);
  } catch (error) {
    logger.error(`Failed to write file: ${filePath}`, error);
    throw error;
  }
}

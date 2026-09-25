import {
  File,
  Paths,
  DownloadTask,
  type DownloadProgress,
} from 'expo-file-system';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

export type DownloadCategory = 'all' | 'documents' | 'images' | 'media' | 'archives' | 'other';

export interface DownloadItem {
  id: string;
  filename: string;
  url: string;
  localUri: string;
  fileSize: number; // in bytes
  formattedSize: string;
  fileType: 'document' | 'image' | 'video' | 'audio' | 'archive' | 'code' | 'other';
  date: string;
  time: string;
  timestamp: number;
  status: 'downloading' | 'completed' | 'failed' | 'canceled';
  progress: number; // 0 to 1
}

const STORAGE_KEY = '@daps_downloads';

// Active download tasks map
const activeDownloadTasks: Map<string, DownloadTask> = new Map();
type DownloadListener = (item: DownloadItem) => void;
const listeners: Set<DownloadListener> = new Set();

export function addDownloadListener(listener: DownloadListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(item: DownloadItem) {
  listeners.forEach(l => {
    try {
      l(item);
    } catch (e) {
      console.warn('Listener error', e);
    }
  });
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function categorizeFileType(filename: string): DownloadItem['fileType'] {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
    return 'document';
  }
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico', 'heic'].includes(ext)) {
    return 'image';
  }
  if (['mp4', 'mov', 'avi', 'mkv', 'webm', '3gp'].includes(ext)) {
    return 'video';
  }
  if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext)) {
    return 'audio';
  }
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'apk'].includes(ext)) {
    return 'archive';
  }
  if (['js', 'ts', 'tsx', 'jsx', 'html', 'css', 'json', 'py', 'java', 'c', 'cpp', 'rs', 'go'].includes(ext)) {
    return 'code';
  }
  return 'other';
}

const SCRIPT_EXTENSIONS = new Set(['php', 'aspx', 'jsp', 'html', 'htm', 'cgi', 'do', 'action', 'ashx', 'cfm']);

function isValidDownloadFilename(name: string): boolean {
  if (!name || !name.includes('.')) return false;
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (SCRIPT_EXTENSIONS.has(ext)) return false;
  return true;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_').trim() || `download_${Date.now()}`;
}

export function extractFilenameFromUrl(downloadUrl: string): string {
  try {
    const urlObj = new URL(downloadUrl);
    // 1. Check query parameters first for explicit filenames
    const queryKeys = ['filename', 'file', 'fn', 'name', 'title', 'document', 'download', 'attachment'];
    for (const key of queryKeys) {
      const val = urlObj.searchParams.get(key);
      if (val && isValidDownloadFilename(val)) {
        return sanitizeFilename(decodeURIComponent(val.split('/').pop() || val));
      }
    }

    // 2. Check all query params for any value with a valid download extension
    for (const [, val] of urlObj.searchParams.entries()) {
      if (val && isValidDownloadFilename(val)) {
        return sanitizeFilename(decodeURIComponent(val.split('/').pop() || val));
      }
    }

    // 3. Check pathname segments
    const segments = urlObj.pathname.split('/').filter(Boolean);
    const last = segments.pop();
    if (last && isValidDownloadFilename(last)) {
      return sanitizeFilename(decodeURIComponent(last));
    }
  } catch {
    const clean = downloadUrl.split('?')[0].split('#')[0];
    const last = clean.split('/').pop();
    if (last && isValidDownloadFilename(last)) {
      return sanitizeFilename(decodeURIComponent(last));
    }
  }
  return `download_${Date.now()}`;
}

export async function getSavedDownloads(): Promise<DownloadItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading downloads', e);
  }
  return [];
}

export async function saveDownloads(items: DownloadItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Error persisting downloads', e);
  }
}

/**
 * Initiates an advanced, progress-tracked download with resilient modern & legacy fallback
 */
export async function startDownload(
  downloadUrl: string,
  suggestedFilename?: string,
  onCompleteCallback?: (item: DownloadItem) => void
): Promise<DownloadItem> {
  const filename = suggestedFilename || extractFilenameFromUrl(downloadUrl);
  const targetFile = new File(Paths.document, filename);
  const id = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5);

  const initialItem: DownloadItem = {
    id,
    filename,
    url: downloadUrl,
    localUri: targetFile.uri,
    fileSize: 0,
    formattedSize: '0 B',
    fileType: categorizeFileType(filename),
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    timestamp: Date.now(),
    status: 'downloading',
    progress: 0,
  };

  notifyListeners(initialItem);

  const onProgress = (data: DownloadProgress) => {
    const total = data.totalBytes;
    const written = data.bytesWritten;
    const progress = total > 0 ? written / total : 0;

    const updated: DownloadItem = {
      ...initialItem,
      fileSize: total > 0 ? total : written,
      formattedSize: formatBytes(total > 0 ? total : written),
      progress: Math.min(1, Math.max(0, progress)),
    };
    notifyListeners(updated);
  };

  let finalUri = targetFile.uri;
  let finalFilename = filename;
  let finalSize = 0;

  try {
    if (targetFile.exists) {
      try {
        targetFile.delete();
      } catch {}
    }

    try {
      const task = new DownloadTask(downloadUrl, targetFile, { onProgress });
      activeDownloadTasks.set(id, task);
      const downloadedFile = await task.downloadAsync();
      activeDownloadTasks.delete(id);

      if (downloadedFile) {
        finalUri = downloadedFile.uri;
        if (downloadedFile.name && downloadedFile.name !== filename && isValidDownloadFilename(downloadedFile.name)) {
          finalFilename = downloadedFile.name;
        }
        if (typeof downloadedFile.size === 'number') {
          finalSize = downloadedFile.size;
        }
      }
    } catch (taskErr) {
      activeDownloadTasks.delete(id);
      console.warn('Modern DownloadTask failed, attempting FileSystemLegacy fallback...', taskErr);

      // Legacy fallback
      const baseDir = FileSystemLegacy.documentDirectory || FileSystemLegacy.cacheDirectory || '';
      const legacyTarget = `${baseDir}${filename}`;
      const legacyResult = await FileSystemLegacy.downloadAsync(downloadUrl, legacyTarget);

      finalUri = legacyResult.uri;
      try {
        const info = await FileSystemLegacy.getInfoAsync(legacyResult.uri);
        if (info.exists && typeof info.size === 'number') {
          finalSize = info.size;
        }
      } catch {}
    }

    const completedItem: DownloadItem = {
      ...initialItem,
      filename: finalFilename,
      localUri: finalUri,
      fileType: categorizeFileType(finalFilename),
      status: 'completed',
      progress: 1,
      fileSize: finalSize,
      formattedSize: formatBytes(finalSize),
    };

    // Persist to storage
    const currentList = await getSavedDownloads();
    const updatedList = [completedItem, ...currentList.filter(i => i.id !== id)];
    await saveDownloads(updatedList);

    notifyListeners(completedItem);
    if (onCompleteCallback) {
      onCompleteCallback(completedItem);
    }

    return completedItem;
  } catch (error) {
    activeDownloadTasks.delete(id);
    const failedItem: DownloadItem = {
      ...initialItem,
      status: 'failed',
      progress: 0,
    };
    notifyListeners(failedItem);
    throw error;
  }
}

/**
 * Saves a data-URI / base64 blob download to the document directory
 */
export async function saveBase64Download(
  dataUri: string,
  suggestedFilename?: string,
  onCompleteCallback?: (item: DownloadItem) => void
): Promise<DownloadItem> {
  const filename = suggestedFilename || `download_${Date.now()}`;
  const targetFile = new File(Paths.document, filename);
  const id = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5);

  const base64Data = dataUri.includes(',') ? dataUri.split(',')[1] : dataUri;

  if (targetFile.exists) {
    try {
      targetFile.delete();
    } catch {}
  }
  targetFile.create();
  targetFile.write(base64Data);

  const completedItem: DownloadItem = {
    id,
    filename,
    url: 'data:download',
    localUri: targetFile.uri,
    fileSize: targetFile.size || 0,
    formattedSize: formatBytes(targetFile.size || 0),
    fileType: categorizeFileType(filename),
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    timestamp: Date.now(),
    status: 'completed',
    progress: 1,
  };

  const currentList = await getSavedDownloads();
  const updatedList = [completedItem, ...currentList.filter(i => i.id !== id)];
  await saveDownloads(updatedList);

  notifyListeners(completedItem);
  if (onCompleteCallback) {
    onCompleteCallback(completedItem);
  }

  return completedItem;
}

/**
 * Open or share a downloaded file
 */
export async function openOrShareFile(file: DownloadItem): Promise<boolean> {
  try {
    let exists = false;
    try {
      const fileRef = new File(file.localUri);
      exists = fileRef.exists;
    } catch {
      const info = await FileSystemLegacy.getInfoAsync(file.localUri);
      exists = info.exists;
    }

    if (!exists) {
      Alert.alert('File not found', 'This file may have been moved or removed from storage.');
      return false;
    }

    const available = await Sharing.isAvailableAsync();
    if (available) {
      await Sharing.shareAsync(file.localUri, {
        dialogTitle: file.filename,
      });
      return true;
    } else {
      Alert.alert('Sharing Unavailable', `File stored at: ${file.localUri}`);
      return false;
    }
  } catch (e: any) {
    Alert.alert('Could not open file', e.message || 'Unknown error');
    return false;
  }
}

/**
 * Delete a downloaded file from both disk and storage
 */
export async function deleteDownloadedFile(fileId: string): Promise<DownloadItem[]> {
  const currentList = await getSavedDownloads();
  const target = currentList.find(i => i.id === fileId);
  if (target && target.localUri) {
    try {
      const fileRef = new File(target.localUri);
      if (fileRef.exists) {
        fileRef.delete();
      }
    } catch {}
  }

  const updated = currentList.filter(i => i.id !== fileId);
  await saveDownloads(updated);
  return updated;
}

/**
 * Clear all downloaded files
 */
export async function clearAllDownloadedFiles(): Promise<void> {
  const list = await getSavedDownloads();
  for (const item of list) {
    if (item.localUri) {
      try {
        const fileRef = new File(item.localUri);
        if (fileRef.exists) {
          fileRef.delete();
        }
      } catch {}
    }
  }
  await saveDownloads([]);
}

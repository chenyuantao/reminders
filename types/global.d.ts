// File System Access API 类型定义
interface FileSystemHandle {
  kind: 'file' | 'directory'
  name: string
}

interface FileSystemFileHandle extends FileSystemHandle {
  kind: 'file'
  getFile(): Promise<File>
  createWritable(options?: FileSystemCreateWritableOptions): Promise<FileSystemWritableFileStream>
  createSyncAccessHandle?(): Promise<FileSystemSyncAccessHandle>
}

interface FileSystemSyncAccessHandle {
  write(buffer: BufferSource, options?: { at?: number }): number
  read(buffer: BufferSource, options?: { at?: number }): number
  close(): void
}

interface FileSystemCreateWritableOptions {
  keepExistingData?: boolean
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: FileSystemWriteChunkType): Promise<void>
  seek(position: number): Promise<void>
  truncate(size: number): Promise<void>
}

type FileSystemWriteChunkType = string | BufferSource | Blob

// 扩展 Window 接口
interface Window {
  showOpenFilePicker(options?: {
    types?: Array<{
      description: string
      accept: Record<string, string[]>
    }>
    multiple?: boolean
  }): Promise<FileSystemFileHandle[]>
  
  showSaveFilePicker(options?: {
    suggestedName?: string
    types?: Array<{
      description: string
      accept: Record<string, string[]>
    }>
  }): Promise<FileSystemFileHandle>
} 
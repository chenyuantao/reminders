export interface FileStorageInfo {
  fileHandle: FileSystemFileHandle | null
  filePath: string | null
  lastModified: number | null
  lastFilePath: string | null // 新增：记录上次选择的文件路径
}

export class FileStorageService {
  private static readonly STORAGE_KEY = 'reminders_file_storage'
  private static readonly REMINDERS_KEY = 'reminders'

  // 获取存储的文件信息
  static getFileStorageInfo(): FileStorageInfo {
    const stored = localStorage.getItem(this.STORAGE_KEY)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        return { fileHandle: null, filePath: null, lastModified: null, lastFilePath: null }
      }
    }
    return { fileHandle: null, filePath: null, lastModified: null, lastFilePath: null }
  }

  // 保存文件存储信息
  static saveFileStorageInfo(info: FileStorageInfo): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(info))
  }

  // 清除文件存储信息
  static clearFileStorageInfo(): void {
    const fileInfo = this.getFileStorageInfo()
    const lastFilePath = fileInfo.lastFilePath // 保留上次的文件路径
    
    // 清除所有信息，但保留lastFilePath
    localStorage.removeItem(this.STORAGE_KEY)
    
    // 如果之前有lastFilePath，重新设置它
    if (lastFilePath) {
      this.setLastFilePath(lastFilePath)
    }
  }

  // 从文件读取数据
  static async readFromFile(fileHandle: FileSystemFileHandle): Promise<any> {
    try {
      // 检查是否支持 getFile 方法
      if (typeof fileHandle.getFile === 'function') {
        const file = await fileHandle.getFile()
        const content = await file.text()
        return JSON.parse(content)
      } else {
        throw new Error('此浏览器不支持文件读取')
      }
    } catch (error) {
      console.error('读取文件失败:', error)
      throw new Error('读取文件失败')
    }
  }

  // 写入数据到文件
  static async writeToFile(fileHandle: FileSystemFileHandle, data: any): Promise<void> {
    try {
      console.log('开始写入文件:', fileHandle.name)
      console.log('文件句柄类型:', typeof fileHandle)
      console.log('文件句柄方法:', Object.getOwnPropertyNames(fileHandle))
      
      // 检查是否支持 createWritable 方法
      if (typeof fileHandle.createWritable === 'function') {
        try {
          console.log('使用 createWritable 方法')
          const writable = await fileHandle.createWritable()
          await writable.write(JSON.stringify(data, null, 2))
          await writable.close()
          console.log('文件写入成功 (createWritable)')
          return
        } catch (createWritableError) {
          console.warn('createWritable 失败，尝试其他方法:', createWritableError)
        }
      }

      // 检查是否支持 createSyncAccessHandle 方法
      if (typeof fileHandle.createSyncAccessHandle === 'function') {
        try {
          console.log('使用 createSyncAccessHandle 方法')
          const accessHandle = await fileHandle.createSyncAccessHandle()
          const encoder = new TextEncoder()
          const dataBytes = encoder.encode(JSON.stringify(data, null, 2))
          accessHandle.write(dataBytes, { at: 0 })
          accessHandle.close()
          console.log('文件写入成功 (createSyncAccessHandle)')
          return
        } catch (syncAccessError) {
          console.warn('createSyncAccessHandle 失败:', syncAccessError)
        }
      }

      // 如果都不支持或都失败，抛出错误
      console.error('所有写入方法都不可用')
      throw new Error('此浏览器不支持文件写入，将回退到localStorage')
    } catch (error) {
      console.error('写入文件失败:', error)
      throw new Error('写入文件失败')
    }
  }
 
  // 从localStorage读取数据
  static readFromLocalStorage(): any {
    const stored = localStorage.getItem(this.REMINDERS_KEY)
    return stored ? JSON.parse(stored) : []
  }

  // 写入数据到localStorage
  static writeToLocalStorage(data: any): void {
    localStorage.setItem(this.REMINDERS_KEY, JSON.stringify(data))
  }

  // 保存数据到localStorage
  static async saveData(data: any): Promise<void> {
    this.writeToLocalStorage(data)
  }

  // 加载数据（优先从文件加载，失败则从localStorage加载）
  static async loadData(): Promise<any> {
    const fileInfo = this.getFileStorageInfo()
    
    if (fileInfo.fileHandle) {
      try {
        const data = await this.readFromFile(fileInfo.fileHandle)
        // 更新最后修改时间
        fileInfo.lastModified = Date.now()
        this.saveFileStorageInfo(fileInfo)
        return data
      } catch (error) {
        console.warn('文件读取失败，回退到localStorage:', error)
      }
    }

    // 回退到localStorage
    return this.readFromLocalStorage()
  }

  // 设置文件句柄
  static setFileHandle(fileHandle: FileSystemFileHandle | null): void {
    const fileInfo = this.getFileStorageInfo()
    fileInfo.fileHandle = fileHandle
    fileInfo.filePath = fileHandle ? fileHandle.name : null
    fileInfo.lastModified = fileHandle ? Date.now() : null
    
    // 如果设置了新文件，更新lastFilePath
    if (fileHandle) {
      fileInfo.lastFilePath = fileHandle.name
    }
    
    this.saveFileStorageInfo(fileInfo)
  }

  // 获取上次选择的文件路径
  static getLastFilePath(): string | null {
    const fileInfo = this.getFileStorageInfo()
    return fileInfo.lastFilePath
  }

  // 设置上次选择的文件路径（不设置文件句柄）
  static setLastFilePath(filePath: string | null): void {
    const fileInfo = this.getFileStorageInfo()
    fileInfo.lastFilePath = filePath
    this.saveFileStorageInfo(fileInfo)
  }

  // 检查文件是否仍然可访问
  static async verifyFileAccess(): Promise<boolean> {
    const fileInfo = this.getFileStorageInfo()
    if (!fileInfo.fileHandle) return false

    try {
      // 尝试读取文件以验证访问权限
      await fileInfo.fileHandle.getFile()
      return true
    } catch {
      // 文件不可访问，清除文件信息
      this.clearFileStorageInfo()
      return false
    }
  }

  // 尝试恢复上次选择的文件（通过权限API）
  static async tryRestoreLastFile(): Promise<FileSystemFileHandle | null> {
    try {
      // 检查是否有缓存的lastFilePath
      const fileInfo = this.getFileStorageInfo()
      if (!fileInfo.lastFilePath) return null

      // 尝试通过权限API恢复文件访问
      if ('queryPermission' in window && 'requestPermission' in window) {
        // 这里我们需要一个文件句柄来查询权限
        // 由于我们无法直接恢复文件句柄，我们需要用户重新选择
        // 但我们可以检查是否有其他方式
        console.log('尝试恢复文件:', fileInfo.lastFilePath)
      }

      return null
    } catch (error) {
      console.warn('恢复文件失败:', error)
      return null
    }
  }

  // 检查是否有文件访问权限（通过权限API）
  static async checkFilePermission(fileHandle: FileSystemFileHandle): Promise<boolean> {
    try {
      if ('queryPermission' in window) {
        const permission = await (fileHandle as any).queryPermission({ mode: 'readwrite' })
        return permission === 'granted'
      }
      return true
    } catch {
      return false
    }
  }

  // 检查文件句柄的兼容性
  static checkFileHandleCompatibility(fileHandle: FileSystemFileHandle): {
    canRead: boolean
    canWrite: boolean
    methods: string[]
  } {
    const methods = []
    let canRead = false
    let canWrite = false

    if (typeof fileHandle.getFile === 'function') {
      methods.push('getFile')
      canRead = true
    }

    if (typeof fileHandle.createWritable === 'function') {
      methods.push('createWritable')
      canWrite = true
    }

    if (typeof fileHandle.createSyncAccessHandle === 'function') {
      methods.push('createSyncAccessHandle')
      canWrite = true
    }

    return { canRead, canWrite, methods }
  }
} 
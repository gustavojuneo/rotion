import { ipcMain } from 'electron'
import { randomUUID } from 'node:crypto'
import os from 'node:os'
import fs from 'node:fs'
import path from 'node:path'
import { IPC } from '@shared/constants/ipc'
import {
  CreateDocumentResponse,
  DeleteDocumentRequest,
  Document,
  FetchAllDocumentsResponse,
  FetchDocumentRequest,
  FetchDocumentResponse,
  SaveDocumentRequest,
} from '@shared/types/ipc'
import { store } from './store'

const homeDir = os.homedir()

const getDocumentsPath = (filename?: string) => {
  if (!filename) return path.join(homeDir, 'noted-documents')
  return path.join(homeDir, 'noted-documents', filename)
}

ipcMain.handle(
  IPC.DOCUMENTS.FETCH_ALL,
  async (_): Promise<FetchAllDocumentsResponse> => {
    const files = fs.readdirSync(getDocumentsPath())
    const documents = files.map((file) => ({
      title: file.split('-')[0],
      id: file.split(file.split('-')[0])[1],
    }))
    return {
      data: documents,
    }
  },
)

ipcMain.handle(
  IPC.DOCUMENTS.FETCH,
  async (_, { id }: FetchDocumentRequest): Promise<FetchDocumentResponse> => {
    const allFiles = await fs.promises.readdir(getDocumentsPath())
    const currentDocument = allFiles.find((f) => f.includes(id))
    const data = await fs.promises.readFile(
      getDocumentsPath(currentDocument),
      'utf-8',
    )
    const document = JSON.parse(data) as Document
    return {
      data: document,
    }
  },
)

ipcMain.handle(
  IPC.DOCUMENTS.CREATE,
  async (): Promise<CreateDocumentResponse> => {
    const id = randomUUID()
    const document: Document = {
      id,
      title: 'Untitled',
    }
    store.set(`documents.${id}`, document)

    const currentPath = path.join(
      homeDir,
      'noted-documents',
      `${document.title}-${id}.json`,
    )

    fs.mkdir(path.dirname(currentPath), { recursive: true }, (err) => {
      if (err) return console.log(err)

      fs.writeFile(
        currentPath,
        JSON.stringify(document, null, 2),
        'utf-8',
        (err) => {
          if (err) console.log(err)
        },
      )
    })

    return {
      data: document,
    }
  },
)

ipcMain.handle(
  IPC.DOCUMENTS.SAVE,
  async (_, { id, title, content }: SaveDocumentRequest): Promise<void> => {
    const currentPath = path.join(
      homeDir,
      'noted-documents',
      `${title}-${id}.html`,
    )

    const document = {
      id,
      title,
      content,
    }

    fs.mkdir(path.dirname(currentPath), { recursive: true }, (err) => {
      if (err) return console.log(err)

      fs.writeFile(
        currentPath,
        JSON.stringify(document, null, 2),
        'utf-8',
        (err) => {
          if (err) console.log(err)
        },
      )
    })

    fs.readdirSync(getDocumentsPath())
      .filter((file) => file.includes(id) && !file.includes(`${title}-${id}`))
      .forEach((file) => fs.unlinkSync(getDocumentsPath(file)))
  },
)

ipcMain.handle(
  IPC.DOCUMENTS.DELETE,
  async (_, { id }: DeleteDocumentRequest): Promise<void> => {
    // @ts-ignore (https://github.com/sindresorhus/electron-store/issues/196)
    const file = fs
      .readdirSync(getDocumentsPath())
      .find((file) => file.includes(id))

    if (file) {
      fs.unlinkSync(getDocumentsPath(file))
    }
  },
)

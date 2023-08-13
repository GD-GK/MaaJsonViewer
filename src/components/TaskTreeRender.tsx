import {
  AddOutlined,
  AddPhotoAlternateOutlined,
  CreateNewFolderOutlined,
  DataObjectOutlined,
  DeleteOutlined,
  FolderOutlined,
  ImageOutlined,
  InsertDriveFileOutlined
} from '@vicons/material'
import {
  NButton,
  NIcon,
  NInput,
  NSwitch,
  NUpload,
  NUploadDragger,
  type TreeOption,
  type UploadCustomRequestOptions,
  type UploadFileInfo,
  useDialog
} from 'naive-ui'
import { computed, ref } from 'vue'

import { deleteTask, setTask, taskIndex } from '@/data'
import { type PathKey, fs, path, pool } from '@/filesystem'

export function renderLabel({ option }: { option: TreeOption }) {
  const key = option.key as PathKey

  if (!path.key_is_dir(key)) {
    const [dir, file, hash] = path.divide(key)
    if (hash) {
      return <span>{hash}</span>
    } else {
      if (file.endsWith('.json')) {
        return <span class=" text-green-600">{file}</span>
      } else {
        return <span>{file}</span>
      }
    }
  } else {
    return <span>{option.key === '/' ? '[ROOT]' : option.label}</span>
  }
}

export function renderPrefix({ option }: { option: TreeOption }) {
  const key = option.key as PathKey

  if (key.endsWith('/')) {
    return (
      <NIcon>
        <FolderOutlined></FolderOutlined>
      </NIcon>
    )
  } else {
    const [dir, file, hash] = path.divide(key)
    if (hash) {
      return (
        <NIcon>
          <DataObjectOutlined></DataObjectOutlined>
        </NIcon>
      )
    } else if (file.endsWith('.png')) {
      return (
        <NIcon>
          <ImageOutlined></ImageOutlined>
        </NIcon>
      )
    } else {
      return (
        <NIcon>
          <InsertDriveFileOutlined></InsertDriveFileOutlined>
        </NIcon>
      )
    }
  }
}

export function renderSuffix({ option }: { option: TreeOption }) {
  const dialog = useDialog()

  const key = option.key as PathKey
  if (path.key_is_dir(key)) {
    return (
      <div class="flex gap-2 mr-2">
        <NButton
          text
          onClick={e => {
            e.stopPropagation()

            const fl = ref<UploadFileInfo[]>([])
            const result: Record<string, ArrayBuffer> = {}
            const fakeRequest = async ({
              file,
              data,
              headers,
              withCredentials,
              action,
              onFinish,
              onError,
              onProgress
            }: UploadCustomRequestOptions) => {
              if (file.name in result) {
                onError()
                return
              }
              if (file.file) {
                const buf = await file.file.arrayBuffer()
                result[file.name] = buf
                onFinish()
              } else {
                onError()
              }
            }
            const dlg = dialog.create({
              title: '添加文件',
              content: () => (
                <NUpload
                  accept="image/png"
                  listType="image-card"
                  fileList={fl.value}
                  onUpdateFileList={data => {
                    fl.value = data
                  }}
                  customRequest={fakeRequest}
                >
                  <NUploadDragger>上传</NUploadDragger>
                </NUpload>
              ),
              action: () => (
                <NButton
                  onClick={() => {
                    fs.history.pause()

                    for (const name in result) {
                      fs.tree.writeBinary(
                        path.joinkey(key, name),
                        pool.put(result[name])
                      )
                    }

                    fs.history.resume()
                    fs.history.commit()

                    dlg.destroy()
                  }}
                >
                  添加
                </NButton>
              )
            })
          }}
        >
          {{
            default: () => (
              <NIcon>
                <AddPhotoAlternateOutlined></AddPhotoAlternateOutlined>
              </NIcon>
            )
          }}
        </NButton>
        <NButton
          text
          onClick={e => {
            e.stopPropagation()

            const name = ref<string>('')
            const nameWithSfx = computed(() =>
              name.value.endsWith('.json') ? name.value : `${name.value}.json`
            )
            const to = computed(() => path.joinkey(key, nameWithSfx.value))
            const pathExists = computed(() => {
              return fs.tree.existsFile(to.value)
            })
            const dlg = dialog.create({
              title: '创建json',
              content: () => (
                <NInput
                  value={name.value}
                  onUpdateValue={v => (name.value = v)}
                  placeholder={'文件名'}
                ></NInput>
              ),
              action: () => (
                <NButton
                  disabled={!name.value || pathExists.value}
                  onClick={() => {
                    if (!pathExists.value) {
                      fs.tree.writeFile(to.value, '{}')
                      dlg.destroy()
                    }
                  }}
                >
                  确认
                </NButton>
              )
            })
          }}
        >
          {{
            default: () => (
              <NIcon>
                <AddOutlined></AddOutlined>
              </NIcon>
            )
          }}
        </NButton>
        <NButton
          text
          onClick={e => {
            e.stopPropagation()

            const name = ref<string>('')
            const p = computed(() => path.joinkey(key, name.value))
            const pathExists = computed(() => {
              return !!fs.tree.existsDir(p.value)
            })

            const dlg = dialog.create({
              title: '创建目录',
              content: () => (
                <NInput
                  value={name.value}
                  onUpdateValue={v => (name.value = v)}
                  placeholder={'文件名'}
                ></NInput>
              ),
              action: () => (
                <NButton
                  disabled={pathExists.value}
                  onClick={() => {
                    if (!pathExists.value) {
                      fs.tree.touchDir(p.value)
                      dlg.destroy()
                    }
                  }}
                >
                  确认
                </NButton>
              )
            })
          }}
        >
          {{
            default: () => (
              <NIcon>
                <CreateNewFolderOutlined></CreateNewFolderOutlined>
              </NIcon>
            )
          }}
        </NButton>
      </div>
    )
  } else {
    const [dir, file, hash] = path.divide(key)
    if (!hash) {
      const isJson = file.endsWith('.json')
      return (
        <div class="flex gap-2 mr-2">
          {isJson ? (
            <NButton
              text
              onClick={e => {
                e.stopPropagation()

                for (let i = 0; ; i++) {
                  const name = `__NewTask${i}`
                  if (name in taskIndex.value) {
                    continue
                  }
                  setTask(path.joinkey(dir, file, name), {})
                  break
                }
              }}
            >
              {{
                default: () => (
                  <NIcon>
                    <AddOutlined></AddOutlined>
                  </NIcon>
                )
              }}
            </NButton>
          ) : (
            []
          )}
          <NButton
            text
            onClick={e => {
              e.stopPropagation()

              const remRef = ref(true)
              dialog.warning({
                title: '删除文件',
                content: () => {
                  if (isJson) {
                    return (
                      <div class="flex flex-col gap-2">
                        <span>{`是否要删除 ${file} ?`}</span>
                        <div class="flex gap-2">
                          <span>移除所有引用</span>
                          <NSwitch
                            value={remRef.value}
                            onUpdate:value={v => (remRef.value = v)}
                          ></NSwitch>
                        </div>
                      </div>
                    )
                  } else {
                    return (
                      <div class="flex flex-col gap-2">
                        <span>{`是否要删除 ${file} ?`}</span>
                      </div>
                    )
                  }
                },
                positiveText: '是',
                onPositiveClick: () => {
                  const p = path.joinkey(dir, file)

                  fs.history.pause()

                  const obj = JSON.parse(fs.tree.readFile(p) ?? '{}')
                  for (const name in obj) {
                    deleteTask(taskIndex.value[name], null)
                  }
                  fs.tree.removeFile(p)

                  fs.history.resume()
                  fs.history.commit()
                }
              })
            }}
          >
            {{
              default: () => (
                <NIcon>
                  <DeleteOutlined></DeleteOutlined>
                </NIcon>
              )
            }}
          </NButton>
        </div>
      )
    }
  }
}

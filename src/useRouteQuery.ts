/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ref,
  watch,
  onActivated,
  onDeactivated,
  onMounted,
  onUnmounted,
  WatchStopHandle,
} from 'vue-demi'
import { useRouter, useRoute } from 'vue-router'

type Value =
  | string
  | number
  | boolean
  | Array<any>
  | Record<string, any>
  | undefined

function transformOut(value: Value): string | undefined {
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number') {
    return String(value)
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }
  if (typeof value === 'object') {
    return encodeURI(JSON.stringify(value))
  }
}

function transformIn(query: string) {
  const num = Number(query)
  if (!isNaN(num)) {
    return num
  }
  if (query === 'true') {
    return true
  }
  if (query === 'false') {
    return false
  }
  try {
    return JSON.parse(decodeURI(query))
  } catch (e) {
    // ignore
  }
  return query
}

const pathQueryCacheMap: Record<string, any> = {}

export default function useRouteQuery<T extends Value>(
  key: string,
  initialValue?: T
) {
  const router = useRouter()
  const route = useRoute()
  const value = ref(initialValue)
  const queryCache = (pathQueryCacheMap[route.path] ??= { ...route.query })
  queryCache[key] = route.query[key] ?? initialValue

  let watcher: WatchStopHandle
  let isInitilized = false

  const onAttach = () => {
    if (isInitilized) {
      return
    }
    isInitilized = true
    // 如果地址中包含 query 且 value 为空，则使用地址中的 query
    if (queryCache[key] && !value.value) {
      value.value = transformIn(queryCache[key])
    }

    // value 变化则更新地址中的 query
    watcher = watch(
      value,
      (newValue) => {
        const newQueryValue = transformOut(newValue)
        if (newQueryValue) {
          // 实时同步最新的 query
          queryCache[key] = newQueryValue
        } else {
          delete queryCache[key]
        }
        router.replace({ query: queryCache })
      },
      { immediate: true }
    )
  }

  const onDettach = () => {
    if (!isInitilized) {
      return
    }
    isInitilized = false
    watcher()
  }

  onActivated(onAttach)
  onDeactivated(onDettach)
  onMounted(onAttach)
  onUnmounted(onDettach)

  return value
}

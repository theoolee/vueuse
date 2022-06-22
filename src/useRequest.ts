/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ref, onBeforeUnmount, Ref, UnwrapRef } from 'vue-demi'

type Fn = (...args: any[]) => any
type RefReturnType<T extends Fn> = ReturnType<T> extends Promise<infer R>
  ? Ref<R>
  : Ref<ReturnType<T>>
type ReturnValue<T extends Fn> = readonly [
  Ref<UnwrapRef<RefReturnType<T>> | null>,
  (...args: Parameters<T>) => Promise<UnwrapRef<RefReturnType<T>> | null>
]

const onRequestAllSetMap = new Map<string | Fn, Set<Fn>>()

function addToSet(key: any, value: Fn) {
  if (!key) return
  const set = onRequestAllSetMap.get(key)
  if (set) {
    set.add(value)
  } else {
    onRequestAllSetMap.set(key, new Set([value]))
  }
}

function delFromSet(key: any, value: Fn) {
  if (!key) return
  const set = onRequestAllSetMap.get(key)
  if (set) {
    set.delete(value)
  }
}

export async function requestAll(id: Fn | string) {
  await Promise.all(
    Array.from(onRequestAllSetMap.get(id) ?? []).map((fn) => fn())
  )
}

// id 可以是函数，也可以是字符串，若仅有一个函数作为参数，id 为此函数
export default function useRequest<T extends Fn>(fn: T): ReturnValue<T>
export default function useRequest<T extends Fn>(
  id: Fn | string,
  fn: T
): ReturnValue<T>
export default function useRequest<T extends Fn>(
  id: T | string,
  fn?: T
): ReturnValue<T> {
  let lastArgs: Parameters<T>
  let isInitilized = false
  const response = ref<RefReturnType<T> | null>(null)
  const request = async (...args: Parameters<T>) => {
    response.value = await (fn ?? (id as T))(...args)
    // 为了确保 requestAll 时参数正确，只有手动调用过 request 才能在 requestAll 时更新响应
    isInitilized ||= true
    // 缓存上次调用函数时的参数
    lastArgs = JSON.parse(JSON.stringify(args))
    return response.value
  }
  const onRequestAll = async () => {
    if (isInitilized) {
      await request(...lastArgs)
    }
  }
  // 记录 id 对应的函数
  addToSet(id, onRequestAll)
  onBeforeUnmount(() => {
    delFromSet(id, onRequestAll)
  })
  return [response, request] as const
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { getCurrentInstance } from 'vue-demi'

export default function useForwardRef() {
  const instance = getCurrentInstance()
  function handleRefChange(realRef: any) {
    if (instance) {
      instance.exposed = realRef
      instance.exposeProxy = realRef
    }
  }
  return handleRefChange
}

// found this here: https://gist.github.com/glebsexy/41288eebff0f8b8bff3ab0714d2481bf
// currently not using it


import { EventEmitter } from 'events'

interface CustomEE extends EventEmitter {
  send: { (event: string, data: any): void }
  async: (ev: string) => Promise<any>
}

function createInterface(renderer: boolean) {
  const emitter = new EventEmitter() as CustomEE

  const receive = (result: { event: string | symbol, data: any }) => {
    if (result && result.event) {
      emitter.emit(result.event, result.data)
    }
  }

  if (renderer) {
    window.onmessage = ev => receive(ev.data.pluginMessage)
  } else {
    figma.ui.onmessage = data => receive(data)
  }

  emitter.send = function (event, data) {
    if (typeof event !== 'string') {
      throw new Error('Expected first argument to be an event name string')
    }
    const postData = {
      event,
      data
    }
    if (renderer) {
      window.parent.postMessage({ pluginMessage: postData }, '*')
    } else {
      figma.ui.postMessage(postData)
    }
  }

  emitter.async = function (ev) {
    return new Promise((resolve) => {
      this.once(ev, resolve)
    })
  }

  return emitter
}

const isRenderer = typeof figma === 'undefined'
export const html = isRenderer ? createInterface(true) : undefined
export const script = isRenderer ? undefined : createInterface(false)
function getKeyForNamespace (namespace) {
  return `coco.tracker.pageUnloadRetries.${namespace}`;
}

function getNamespaceData (namespace) {
  const namespaceKey = getKeyForNamespace(namespace)
  const namespaceRetriesJson = window.sessionStorage.getItem(namespaceKey)

  return JSON.parse(namespaceRetriesJson || '[]')
}

function setNamespaceData(namespace, data) {
  const namespaceKey = getKeyForNamespace(namespace)

  if (data) {
    window.sessionStorage.setItem(namespaceKey, JSON.stringify(data))
  } else {
    window.sessionStorage.removeItem(namespaceKey)
  }
}

function runAfterPageLoad (namespace, identifier, args) {
  const namespaceRetries = getNamespaceData(namespace)

  namespaceRetries.push({
    identifier,
    args,
    at: new Date().getTime()
  })

  setNamespaceData(namespace, namespaceRetries)
}

export async function watchForPageUnload (timeout = 500) {
  let unloadCallback;
  const unloadPromise = new Promise((resolve, reject) => {
    unloadCallback = reject('unload')
    window.addEventListener('beforeunload', unloadCallback)
  })

  const timeoutPromise = new Promise((resolve) => setTimeout(resolve, timeout));

  try {
    await Promise.race([ unloadPromise, timeoutPromise ])
  } finally {
    window.removeEventListener('beforeunload', unloadCallback)
  }
}

export async function retryOnPageUnload (namespace, identifier, args, func, timeout = 500) {
  const unloadPromise = watchForPageUnload(timeout)

  func()

  try {
    await unloadPromise
  } catch (e) {
    if (e !== 'unload') {
      throw e
    }

    runAfterPageLoad(namespace, identifier, args)
  }
}

export async function getPageUnloadRetriesForNamespace (namespace, timeout = 15000) {
  const namespaceRetries = getNamespaceData(namespace) || []

  setNamespaceData(namespace, undefined)
  return namespaceRetries
    .filter(retry => new Date().getTime() - retry.at < timeout)
}

import { useEffect, useState } from 'react'

// A tiny hash router: "#/invoice/abc" is ["invoice", "abc"]. It needs no server setup,
// so it works the same on a web host, offline, and inside the Android app.
function parse() {
  return window.location.hash
    .replace(/^#\/?/, '')
    .split('/')
    .filter(Boolean)
    .map(decodeURIComponent)
}

export function useRoute() {
  const [parts, setParts] = useState(parse)
  useEffect(() => {
    const onChange = () => {
      setParts(parse())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return parts
}

export function go(path, { replace = false } = {}) {
  if (replace) window.location.replace('#' + path)
  else window.location.hash = path
}

export function Link({ to, children, ...rest }) {
  return (
    <a href={'#' + to} {...rest}>
      {children}
    </a>
  )
}

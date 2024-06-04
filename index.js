'use strict';

/**
 * Respond with hello worker text
 * @param {Request} request
 */
async function handleRequest(request) {
  // fetch pages and initialize
  if (!variants) {
    const res = await fetch('https://cfw-takehome.developers.workers.dev/api/variants')
    const json = await res.json()
    variants = json.variants
    contents = await Promise.all(variants.map(async v => {
      const res = await fetch(v)
      const text = await res.text()
      return text
    }))
  }

  // read cookies and select which page to present
  const [select, set_cookie] = (function () {
    const COOKIE_NAME = 'ABtest'
    const cookie = request.headers.get('cookie')
    if (cookie && cookie.includes(`${COOKIE_NAME}=0`)) {
      return [0, null]
    } else if (cookie && cookie.includes(`${COOKIE_NAME}=1`)) {
      return [1, null]
    } else {
      // new client
      const select = Math.random() < 0.5 ? 0 : 1
      const set_cookie = `${COOKIE_NAME}=${select}; path=/`
      return [select, set_cookie]
    }
  })()

  // render the page and modify
  let content = contents[select]
  const response = new Response(content, {
    headers: { 'content-type': 'text/html' },
  })
  if (set_cookie) {
    response.headers.append('Set-Cookie', set_cookie)
  }
  return new HTMLRewriter()
    .on('title', { text: t => {
      if (t.lastInTextNode) {
        t.after(` Page`)
      }
    }})
    .on('h1#title', { text: t => {
      if (t.lastInTextNode) {
        t.after(` is the page you're visiting.`)
      }
    }})
    .on('p#description', { text: t => {
      if (t.lastInTextNode) {
        t.after(select == 0 ? ` Have a good day!` : ` Goodbye cruel world!`)
      }
    }})
    .transform(response)
}

// variables
let variants
let contents
let counter = 0

// register listener
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})
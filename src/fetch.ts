import { App } from 'astro/app'
import { actions, getFetchState, middleware, pages } from 'astro/hono'
import { createParticipantFetch } from 'participant-app-base'
import { updateNote } from '@/server/note'

export default createParticipantFetch({
  App,
  middleware,
  actions,
  pages,
  mutations: [{ method: 'POST', path: '/admin/note' }],
  routes(app) {
    app.post('/admin/note', (c) => updateNote(c.req.raw, getFetchState(c).locals.access))
  }
})

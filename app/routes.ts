import { form, get, post, route } from 'remix/routes'

export const routes = route({
  assets: get('/assets/*path'),
  home: '/',
  work: { index: '/work', show: '/work/:slug' },
  about: '/about',
  contact: '/contact',
  media: get('/media/:id'),
  mail: post('/api/mail'),
  admin: {
    // The sign-in form is its own map so the guard on the rest does not apply to it.
    login: form('/admin/login'),
    home: get('/admin'),
    logout: post('/admin/logout'),
    backup: get('/admin/backup'),
    site: get('/admin/site'),
    saveSite: post('/admin/site'),
    list: get('/admin/c/:kind'),
    edit: get('/admin/c/:kind/:id'),
    save: post('/admin/c/:kind/:id'),
    remove: post('/admin/c/:kind/:id/delete'),
    move: post('/admin/c/:kind/:id/move'),
  },
})

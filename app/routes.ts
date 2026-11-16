import { get, route } from 'remix/routes'

export const routes = route({
  assets: get('/assets/*path'),
  home: '/',
  work: { index: '/work', show: '/work/:slug' },
  about: '/about',
  contact: '/contact',
  media: get('/media/:id'),
})

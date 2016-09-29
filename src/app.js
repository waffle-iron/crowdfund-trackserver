import 'babel-polyfill'
import Koa from 'koa'
import koaRouter from 'koa-router'
import convert from 'koa-convert'
import cors from 'kcors'
import cache from 'koa-cache-lite'
import getListOfTracks from './s3'

const app = new Koa()
const router = koaRouter()
const corsOptions = {
  origin: function (ctx) {
    return ctx.request.origin
  }
}

// use in-memory cache
cache
  .configure({
    '/tracklist': 5 * 60 * 1000 // ms
  }, {
    debug: true
  })

router
  .get('/', async (ctx, next) => {
    ctx.redirect('https://resonate.is')
    await next()
  })
  .get('/tracklist', async (ctx, next) => {
    try {
      const trackList = await getListOfTracks()
      ctx.body = trackList
      ctx.status = 200
      await next()
    } catch (err) {
      console.error(err)
      ctx.body = {
        status: 500,
        message: 'Something went wrong. Sorry about that.'
      }
      ctx.status = 500
      await next()
    }
  })

app
  .use(convert(cache.middleware()))
  .use(convert(cors(corsOptions)))
  .use(router.routes())
  .use(router.allowedMethods())
  .use(async (ctx, next) => {
    const start = new Date()
    await next()
    const ms = new Date() - start
    console.log(`${ctx.method} ${ctx.url} ${ctx.status} - ${ms}ms`)
  })

app.listen(5000)

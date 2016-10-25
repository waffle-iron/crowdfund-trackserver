import 'babel-polyfill'
import Koa from 'koa'
import koaRouter from 'koa-router'
import convert from 'koa-convert'
import cors from 'kcors'
import cache from 'koa-cache-lite'
import xhr from 'koa-request-xhr'
import getListOfTracks from './s3'
import envalid from 'envalid'

const { str } = envalid

const env = envalid.cleanEnv(process.env, {
  ALLOWED_ORIGIN: str({default: 'https://resonate.is'})
})

const app = new Koa()
const router = koaRouter()
const corsOptions = {
  origin: function (ctx) {
    return env.ALLOWED_ORIGIN
  }
}

// use in-memory cache
cache
  .configure({
    '/tracklist': 3 * 60 * 1000 // ms
  }, {
    debug: true,
    allowHeaders: ['Origin', 'X-Requested-With'],
    ignoreNoCache: true
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
  .use(async (ctx, next) => {
    const start = new Date()
    await next()
    const ms = new Date() - start
    console.log(`${ctx.method} ${ctx.url} ${ctx.status} - ${ms}ms`)
  })
  .use(convert(cors(corsOptions)))
  .use(convert(xhr()))
  .use(async (ctx, next) => {
  // only respond if X-Requested-With: XMLHttpRequest header is present
    if (ctx.state.xhr) {
      await next()
    } else {
      ctx.redirect('https://resonate.is')
    }
  })
  .use(convert(cache.middleware()))
  .use(router.routes())
  .use(router.allowedMethods())

app.listen(5000)

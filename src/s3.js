import _ from 'lodash'
import knox from 'knox'
import AWS from 'aws-sdk'
import 'colors'
import envalid from 'envalid'

// Load environmental variables from .env file
const { str } = envalid

const env = envalid.cleanEnv(process.env, {
  AWS_ACCESS_KEY_ID: str(),
  AWS_SECRET_ACCESS_KEY: str(),
  AWS_S3_REGION: str(),
  AWS_S3_BUCKET_NAME: str()
})

const s3 = new AWS.S3()
const s3Credentials = {
  accessKeyId: env.AWS_ACCESS_KEY_ID,
  secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  region: env.AWS_S3_REGION,
  sslEnabled: true
}
s3.config.update(s3Credentials)
const knoxSettings = {
  key: env.AWS_ACCESS_KEY_ID,
  secret: env.AWS_SECRET_ACCESS_KEY,
  bucket: env.AWS_S3_BUCKET_NAME
}
const client = knox.createClient(knoxSettings)
const urlMacro = `https://${env.AWS_S3_BUCKET_NAME}.s3.amazonaws.com`
const keyFilePath = 'test/track/audio/unprocessed'
const keyVisualPath = 'test/track/visual/unprocessed'

export default function () {
  return new Promise(function (resolve, reject) {
    console.log('\n\n\n\n... fetching list of tracks from S3 bucket ...'.yellow)
    client.list({ prefix: keyFilePath }, function (err, data) {
      if (err) {
        reject(err)
      } else {
        const sampleSizeSetting = 10
        const sampleTracks = _.sampleSize(data.Contents, sampleSizeSetting)
        const resultsArray = sampleTracks.filter(obj => {
          /** hack to weed out any potential non .mp3 files */
          return /.\.mp3$/.test(obj.Key)
        }).map(fetchTrackInfo)

        console.log('... awaiting all fetches to finish before responding ...'.yellow)
        Promise.all(resultsArray)
          .then(res => {
            console.log('... all finished, providing result ...'.green)
            resolve(res)
          }).catch(err => {
            reject(err)
          })
      }
    })
  })
}

export function fetchTrackInfo (object) {
  return new Promise(function (resolve, reject) {
    const objectKey = object.Key
    const expiryInSeconds = 60 * 60
    const params = {
      Bucket: knoxSettings.bucket,
      Key: objectKey,
      Expires: expiryInSeconds
    }
    s3.getSignedUrl('getObject', params, function (err, url) {
      console.log('\t... getting signed URLs for chosen objects ...'.blue)
      if (err) {
        reject(err)
      } else {
        console.log('\t... getting object metadata for processing ...'.cyan)
        client.getFile(objectKey, function (err, res) {
          if (err) {
            reject(err)
          }
          // now we have to wrangle the result into a correct JSON entry for Amplitude.js
          const resultObj = {}
          const objectHeaders = res.headers
          const metaMap = {
            'name': 'x-amz-meta-track-name',
            'artist': 'x-amz-meta-artist',
            'album': 'x-amz-meta-album',
            'duration': 'x-amz-meta-track-duration'
          }
          Object.keys(metaMap).map(function (k) {
            resultObj[k] = objectHeaders[metaMap[k]] ? objectHeaders[metaMap[k]] : ''
          })
          // cover art should be stored with the same uuid as the track for now, so check for visual
          // TODO:  allow for different file types (.gif, .webm)
          const visualKey = objectHeaders['x-amz-meta-visual-key'] || null
          if (visualKey) {
            resultObj['cover_art_url'] = `${urlMacro}/${keyVisualPath}/${visualKey}.jpg`
          }
          resultObj['url'] = url
          console.log('\t... adding resolved object to array ...'.green)
          console.log(JSON.stringify(resultObj, null, '\t'))
          resolve(resultObj)
        })
      }
    })
  })
}

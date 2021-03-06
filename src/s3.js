import _ from 'lodash'
import knox from 'knox'
import AWS from 'aws-sdk'
import 'colors'
import envalid from 'envalid'
import mimelib from 'mimelib'

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
const keyFilePath = 'track/audio'
const keyVisualPath = 'track/visual'

export default function () {
  return new Promise(function (resolve, reject) {
    console.log('\n\n\n\n... fetching list of tracks from S3 bucket ...'.yellow)
    client.list({ prefix: keyFilePath }, function (err, data) {
      if (err) {
        reject(err)
      } else {
        const sampleSizeSetting = 7
        const sampleTracks = _.sampleSize(data.Contents, sampleSizeSetting)
        const resultsArray = sampleTracks.filter(obj => {
          /** hack to weed out any potential non .mp3 files */
          return /.\.mp3$/.test(obj.Key)
        }).map(fetchTrackInfo)

        console.log('... awaiting all fetches to finish before responding ...'.yellow)
        Promise.all(resultsArray)
          .then(res => {
            console.log('... all finished, providing result ...'.green)
            const filtered = res.filter(function (x) {
              var hasWeirdChars = false
              Object.keys(x).map(function (k) {
                if (/.*\?UTF\-8\?.*/.test(x[k])) {
                  hasWeirdChars = true
                }
              })
              return !hasWeirdChars
            })
            resolve(filtered)
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
        client.headFile(objectKey, function (err, res) {
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
          resultObj['url'] = url
          Object.keys(metaMap).map(function (k) {
            resultObj[k] = objectHeaders[metaMap[k]] ? mimelib.parseMimeWords(objectHeaders[metaMap[k]]) : ''
          })
          // cover art should be stored with the same uuid as the track for now, so check for visual
          // TODO:  allow for different file types (.gif, .webm)
          const visualKey = objectHeaders['x-amz-meta-visual-key'] || null
          if (visualKey) {
            console.log('\t... checking if thumbnail available ...'.yellow)
            // check if smaller thumbnail is available
            const thumbKey = visualKey.replace(keyVisualPath, keyVisualPath + '/80x80')
            checkIfFileExists(thumbKey).then(function () {
              // resolve with thumbnail
              resultObj['cover_art_url'] = `${urlMacro}/${thumbKey}`
              resolve(addObjectToResults(resultObj))
            }).catch(function () {
                // resolve with full size artwork
                resultObj['cover_art_url'] = `${urlMacro}/${visualKey}`
                resolve(addObjectToResults(resultObj))
            })
          } else {
            // resolve without cover
            resolve(addObjectToResults(resultObj))
          }
        })
      }
    })
  })
}

export function checkIfFileExists (key) {
  return new Promise(function (resolve, reject) {
    client.headFile(key, function (err, res) {
      if (err || res.statusCode !== 200) {
        reject(err)
      }
      resolve(res)
    })
  })
}

function addObjectToResults (resultObj) {
  console.log(`\t... adding resolved object to array ...`.green)
  console.log(JSON.stringify(resultObj, null, '\t'))
  return resultObj
}

// @ts-nocheck
import * as core from '@actions/core'
import { info } from '@actions/core'
import { get } from 'https'
import { createWriteStream, readdir, readFile } from 'fs'
import AdmZip from 'adm-zip'
import xml2js from 'xml2js'
import fetch from 'node-fetch'
import path from 'path'
import glob from 'glob'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */

const targetDirectory = 'apps/hr-web-app' // Directory to search within

const stripToSrcModule = filePath => {
  const pattern = 'src/modules/'
  const index = filePath.indexOf(pattern)
  if (index !== -1) {
    return filePath.substring(index)
  }
  return filePath // Return the original path if 'src/modules/' is not found
}

// Function to gather all .spec files in the repo
const gatherSpecFiles = callback => {
  const pattern = `${targetDirectory}/src/**/*.spec.{js,ts,tsx}` // Pattern to match all .spec.js files

  // Use glob to match files based on the pattern
  glob(pattern, { nodir: true }, (err, files) => {
    if (err) {
      console.error('Error occurred while gathering spec files:', err)
      return callback(err)
    }

    // Resolve absolute paths for the spec files
    const absolutePaths = files.map(file => path.resolve(file))

    callback(null, absolutePaths.map(stripToSrcModule))
  })
}

export async function run(): Promise<void> {
  console.log('Current working directory:', process.cwd())

  try {
    const token = core.getInput('TOKEN')
    const latest_run_id = core.getInput('LATEST_RUN_ID')
    const artifacts = await fetchArtifacts(latest_run_id, token)
    const target = artifacts.find(at => at.name === 'merged-jest-junit.xml')
    if (!target) {
      info(`No artifacts found for job ID: ${jobId}`)
      return
    }

    await downloadArtifact(target, token)

    // Log the current timestamp, wait, then log the new timestamp
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}

function fetchArtifacts(jobId, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/Thinkei/frontend-core/actions/runs/${jobId}/artifacts`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'GitHub Actions Fetch Artifacts',
        Accept: 'application/vnd.github.v3+json'
      }
    }

    get(options, res => {
      let data = ''
      res.on('data', chunk => {
        data += chunk
      })
      res.on('end', () => {
        if (res.statusCode === 200) {
          const artifacts = JSON.parse(data).artifacts
          resolve(artifacts)
        } else {
          reject(
            new Error(
              `Failed to fetch artifacts: ${res.statusCode} ${res.statusMessage}`
            )
          )
        }
      })
    }).on('error', e => {
      reject(e)
    })
  })
}

// Function to unzip the artifact
function unzipArtifact(zipFilePath) {
  try {
    const zip = new AdmZip(zipFilePath)
    const outputDir = path.resolve(__dirname, 'zip_result')
    zip.extractAllTo(outputDir, true)

    // Execute the function and log the results
    gatherSpecFiles((err, specFiles) => {
      if (err) {
        console.error('Failed to gather spec files.')
        return
      }

      console.log('Spec files found:', specFiles)
    })
  } catch (error) {
    console.error('Error unzipping artifact:', error)
  }
}

async function downloadArtifact(artifact, token) {
  const options = {
    method: 'GET',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json'
    }
  }

  try {
    const response = await fetch(artifact.archive_download_url, options)

    if (!response.ok) {
      throw new Error(
        `HTTP error! status: ${response.status} ${response.statusText}`
      )
    }
    const zipFilePath = path.resolve(__dirname, `artifact_123.zip`)

    const dest = createWriteStream(zipFilePath)
    response.body.pipe(dest)

    dest.on('finish', () => {
      console.log('Artifact downloaded successfully.')
      unzipArtifact(zipFilePath)
    })

    dest.on('error', err => {
      console.error('Error writing to file', err)
    })
  } catch (error) {
    console.error('Error downloading artifact:', error)
  }
}

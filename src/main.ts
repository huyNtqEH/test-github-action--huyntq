// @ts-nocheck
import * as core from '@actions/core'
import { getInput, setFailed, info } from '@actions/core'
import { wait } from './wait'
import { get } from 'https'
import { writeFileSync, createWriteStream } from 'fs'
import { join } from 'path'
import AdmZip from 'adm-zip'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const ms: string = core.getInput('milliseconds')

    // Debug logs are only output if the `ACTIONS_STEP_DEBUG` secret is true
    core.debug(`Waiting ${ms} milliseconds ...`)
    console.log('HELLO WORLD!!!')
    core.info(`Hello, World!!!!`)

    const token = core.getInput('TOKEN')
    const latest_run_id = core.getInput('LATEST_RUN_ID')
    console.log(`Hello, World!!!!`, token, latest_run_id)
    const artifacts = await fetchArtifacts(latest_run_id, token)
    if (!artifacts || artifacts.length === 0) {
      info(`No artifacts found for job ID: ${jobId}`)
      return
    }

    for (const artifact of artifacts) {
      await downloadArtifact(artifact, token)
      logArtifactContents(artifact.name)
    }
    // const artifactsResponse = await axios.get(`https://api.github.com/repos/${owner}/${repo}/actions/runs/${jobId}/artifacts`, {
    //   headers: {
    //     Authorization: `Bearer ${token}`,
    //     Accept: 'application/vnd.github.v3+json'
    //   }
    // });

    // Log the current timestamp, wait, then log the new timestamp
    core.debug(new Date().toTimeString())
    await wait(parseInt(ms, 10))
    core.debug(new Date().toTimeString())

    // Set outputs for other workflow steps to use
    core.setOutput('time', new Date().toTimeString())
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}

function logArtifactContents(artifactName) {
  const artifactPath = join(process.cwd(), `${artifactName}.zip`)
  const zip = new AdmZip(artifactPath)
  const zipEntries = zip.getEntries()

  zipEntries.forEach(entry => {
    if (entry.isDirectory) {
      info(`Directory: ${entry.entryName}`)
    } else {
      info(`File: ${entry.entryName}`)
      const fileContent = zip.readAsText(entry)
      info(`Content: ${fileContent}`)
    }
  })
}

function fetchArtifacts(jobId, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/Thinkei/frontend-core/actions/runs/${jobId}/artifacts`,
      method: 'GET',
      headers: {
        Authorization: `token ${token}`,
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

function downloadArtifact(artifact, token) {
  return new Promise((resolve, reject) => {
    const downloadUrl = artifact.archive_download_url
    const artifactPath = join(process.cwd(), `${artifact.name}.zip`)
    const fileStream = createWriteStream(artifactPath)

    const options = {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'GitHub Actions Fetch Artifacts',
        Accept: 'application/vnd.github.v3+json'
      }
    }

    get(downloadUrl, options, res => {
      if (res.statusCode === 200) {
        res.pipe(fileStream)
        fileStream.on('finish', () => {
          fileStream.close()
          info(`Downloaded artifact: ${artifact.name} to ${artifactPath}`)
          resolve()
        })
      } else {
        reject(
          new Error(
            `Failed to download artifact: ${res.statusCode} ${res.statusMessage}`
          )
        )
      }
    }).on('error', e => {
      reject(e)
    })
  })
}

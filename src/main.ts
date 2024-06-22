// @ts-nocheck
import * as core from '@actions/core'
import path from 'path'
import glob from 'glob'
import { splitTestSuite } from './utils'
import { getLatestWorkflowId, getArtifacts } from './requests'
import { downloadArtifact } from './artifact_handlers'

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
  try {
    const token = core.getInput('TOKEN')
    const options = {
      method: 'GET',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    }

    // get latest workflow id that has test results
    const latestRunId = await getLatestWorkflowId(options)
    if (!latestRunId) {
      console.log('No latest run found', latestRunId)
      // No test report available => split the test suite based on the spec files
      gatherSpecFiles((err, specFiles) => {
        splitTestSuite(specFiles, [])
      })
      return
    }
    console.log('Found workflow', latestRunId)

    // get artifact that contains test results
    const targetArtifact = await getArtifacts(latestRunId, options)
    if (!targetArtifact) {
      console.log('No artifacts found', targetArtifact)

      // No test report available => split the test suite based on the spec files
      gatherSpecFiles((err, specFiles) => {
        splitTestSuite(specFiles, [])
      })
      return
    }
    await downloadArtifact(target, token)

    // Log the current timestamp, wait, then log the new timestamp
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}

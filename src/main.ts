import * as core from '@actions/core'
import { wait } from './wait'
const https = require('https')

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

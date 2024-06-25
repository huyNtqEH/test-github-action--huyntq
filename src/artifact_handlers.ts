// @ts-nocheck
import { createWriteStream } from 'fs'
import AdmZip from 'adm-zip'
import * as xml2js from 'xml2js'
import fetch from 'node-fetch'
import path from 'path'
import { promises as fs } from 'fs'
import { gatherSpecFiles } from './main'

// Function to unzip the artifact
export const unzipArtifact = async zipFilePath => {
  try {
    const zip = new AdmZip(zipFilePath)
    const outputDir = path.resolve(__dirname, 'zip_result')
    zip.extractAllTo(outputDir, true)

    // Execute the function and log the results
    gatherSpecFiles(async (err, specFiles) => {
      if (err) {
        console.error('Failed to gather spec files.')
        return
      }
      const parser = new xml2js.Parser()
      const xml = fs.readFileSync(
        path.resolve(__dirname, './zip_result/merged-jest-junit.xml'),
        'utf8'
      )
      const result = await parser.parseStringPromise(xml)
      const testHistory = result.testsuites.testsuite // timing history => dictionary, map
      splitTestSuite(specFiles, testHistory)
    })
  } catch (error) {
    console.error('Error unzipping artifact:', error)
  }
}

export const downloadArtifact = async (artifact, token) => {
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
    const zipFilePath = path.resolve(__dirname, `test-report.zip`)

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

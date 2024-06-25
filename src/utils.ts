// @ts-nocheck
import { promises as fs } from 'fs'
import path from 'path'
import { DefaultArtifactClient } from '@actions/artifact'

export const splitTestSuite = async (totalFiles = [], testReportData = []) => {
  const artifact = new DefaultArtifactClient()
  const totalNodes = 16
  const nodes = {}
  const nodeTotalTimes = {}
  for (let i = 0; i < Number(totalNodes); i++) {
    nodes[i] = ''
    nodeTotalTimes[i] = 0
  }

  const currentTestSuiteWithTiming = totalFiles
    .map(file => {
      const found = testReportData.find(meta => meta.$.name === file)
      if (found) {
        return {
          name: file,
          time: parseFloat(found.$.time)
        }
      }
      return {
        name: file,
        time: 10
      }
    })
    .sort((a, b) => parseFloat(b.time) - parseFloat(a.time))

  for (const testSuite of currentTestSuiteWithTiming) {
    let minNode = 0
    for (let i = 0; i < Number(totalNodes); i++) {
      if (nodeTotalTimes[i] < nodeTotalTimes[minNode]) {
        minNode = i
      }
    }
    nodes[minNode] += `${testSuite.name} `
    nodeTotalTimes[minNode] += parseFloat(testSuite.time)
  }
  const outputDir = 'split-test-results'
  const outputFilePath = path.join(outputDir, `split-test-results.json`)

  if (!(await exists(outputDir))) {
    await fs.mkdir(outputDir, { recursive: true })
  }
  await fs.writeFile(outputFilePath, JSON.stringify(nodes))

  const { id, size } = await artifact.uploadArtifact(
    // name of the artifact
    'split-test-results',
    // files to include (supports absolute and relative paths)
    ['./split-test-results/split-test-results.json'],
    path.resolve('./split-test-results'),
    {
      // optional: how long to retain the artifact
      // if unspecified, defaults to repository/org retention settings (the limit of this value)
      retentionDays: 10
    }
  )
  console.log(`Created artifact with id: ${id} (bytes: ${size}`)
}

export const exists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

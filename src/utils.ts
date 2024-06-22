// @ts-nocheck
import { promises as fs } from 'fs'
import path from 'path'

export const splitTestSuite = async (totalFiles = [], testReportData = []) => {
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
}

export const exists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

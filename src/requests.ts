// @ts-nocheck
import { WORKFLOW } from './constants'
import fetch from 'node-fetch'

export const getLatestWorkflowId = async options => {
  const workflowRunRes = await fetch(
    `https://api.github.com/repos/Thinkei/frontend-core/actions/workflows/${WORKFLOW}/runs?branch=master&status=success`,
    options
  )
  const data = await workflowRunRes.json()
  return data?.workflow_runs?.[0]?.id
}

export const getArtifacts = async (latestRunId, options) => {
  const artifactRes = await fetch(
    `https://api.github.com/repos/Thinkei/frontend-core/actions/runs/${latestRunId}/artifacts`,
    options
  )
  const artifactData = await artifactRes.json()
  return (artifactData?.artifacts || []).find(
    art => art.name === 'merged-jest-junit.xml'
  )
}

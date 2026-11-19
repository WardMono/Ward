import type { ErrorCode } from '../../shared/ipc-contract'

type RepoCode = Extract<ErrorCode, 'INVALID_INPUT' | 'NOT_FOUND' | 'IO_ERROR'>

export class RepoError extends Error {
  readonly code: RepoCode

  constructor(code: RepoCode) {
    super(repoMessage(code))
    this.name = 'RepoError'
    this.code = code
  }
}

function repoMessage(code: RepoCode): string {
  if (code === 'NOT_FOUND') return 'That record was not found.'
  if (code === 'IO_ERROR') return 'The vault record could not be saved.'
  return 'This value was not accepted.'
}

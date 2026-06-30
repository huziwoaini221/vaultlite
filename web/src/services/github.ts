const GITHUB_API = 'https://api.github.com'
const REPO_NAME = 'vaultlite-backup'

async function githubFetch(token: string, path: string, options: RequestInit = {}): Promise<Response> {
  const resp = await fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!resp.ok && resp.status !== 404) {
    const err = await resp.json().catch(() => ({}))
    throw new Error(err.message || `GitHub API error: ${resp.status}`)
  }
  return resp
}

export interface GitHubUser {
  login: string
  avatar_url: string
}

export async function getAuthenticatedUser(token: string): Promise<GitHubUser> {
  const resp = await githubFetch(token, '/user')
  return resp.json()
}

export async function ensureRepo(token: string): Promise<string> {
  const user = await getAuthenticatedUser(token)
  const owner = user.login
  const resp = await githubFetch(token, `/repos/${owner}/${REPO_NAME}`)
  if (resp.status === 404) {
    const createResp = await fetch(`${GITHUB_API}/user/repos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: REPO_NAME, private: true, auto_init: true }),
    })
    if (createResp.status === 403) {
      const err = await createResp.json().catch(() => ({}))
      throw new Error(
        `Cannot create repo "${REPO_NAME}" — token lacks permission.\n` +
        `Options:\n` +
        `1. Create the repo manually at https://github.com/new (name: ${REPO_NAME}, private), then retry.\n` +
        `2. Use a classic Personal Access Token with full "repo" scope.\n` +
        `API says: ${err.message || 'forbidden'}`
      )
    }
    if (!createResp.ok) throw new Error('Failed to create private repo')
  }
  return owner
}

export async function uploadVault(token: string, encryptedContent: string, message: string): Promise<void> {
  const owner = await ensureRepo(token)
  const content = btoa(unescape(encodeURIComponent(encryptedContent)))
  const getResp = await githubFetch(token, `/repos/${owner}/${REPO_NAME}/contents/vault.enc`)
  if (getResp.status === 404) {
    const resp = await githubFetch(token, `/repos/${owner}/${REPO_NAME}/contents/vault.enc`, {
      method: 'PUT',
      body: JSON.stringify({ message, content }),
    })
    if (!resp.ok) throw new Error('Failed to create vault.enc')
  } else {
    const existing = await getResp.json()
    const resp = await githubFetch(token, `/repos/${owner}/${REPO_NAME}/contents/vault.enc`, {
      method: 'PUT',
      body: JSON.stringify({ message, content, sha: existing.sha }),
    })
    if (!resp.ok) throw new Error('Failed to update vault.enc')
  }
}

export async function downloadVault(token: string): Promise<string> {
  const owner = await ensureRepo(token)
  const getResp = await githubFetch(token, `/repos/${owner}/${REPO_NAME}/contents/vault.enc`)
  if (getResp.status === 404) throw new Error('No vault.enc found in backup')
  const data = await getResp.json()
  return decodeURIComponent(escape(atob(data.content)))
}

export async function testToken(token: string): Promise<GitHubUser> {
  return getAuthenticatedUser(token)
}

export async function getVaultCommits(token: string): Promise<string[]> {
  const owner = await ensureRepo(token)
  const resp = await githubFetch(token, `/repos/${owner}/${REPO_NAME}/commits?path=vault.enc&per_page=5`)
  if (!resp.ok) return []
  const commits = await resp.json()
  return commits.map((c: { sha: string }) => c.sha)
}

export async function downloadVaultAtRef(token: string, ref: string): Promise<string> {
  const owner = await ensureRepo(token)
  const getResp = await githubFetch(token, `/repos/${owner}/${REPO_NAME}/contents/vault.enc?ref=${ref}`)
  if (getResp.status === 404) throw new Error('No vault.enc found at that ref')
  const data = await getResp.json()
  return decodeURIComponent(escape(atob(data.content)))
}

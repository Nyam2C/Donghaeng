// Expo + bun workspaces 호환 Metro config
// 참고: https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require('expo/metro-config')
const path = require('node:path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// 1. Workspace 루트 watch (shared/types/, etc.)
config.watchFolders = [workspaceRoot]

// 2. node_modules 검색 경로 (host metro / Expo 모두 호환)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

// 3. bun workspaces hoist 시 중복 symlink 방지
config.resolver.disableHierarchicalLookup = true

module.exports = config

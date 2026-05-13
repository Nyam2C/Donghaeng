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

// 4. package.json `exports` 처리 + condition name 우선순위 (Phase 3 — D19 후보)
// zustand 5.x esm middleware 가 `import.meta.env` 를 사용 → web bundle 에서 SyntaxError
// `require` 를 first condition 으로 잡아 CJS 빌드 (`./middleware.js`) 선택
config.resolver.unstable_enablePackageExports = true
config.resolver.unstable_conditionNames = ['require', 'react-native', 'browser']

module.exports = config

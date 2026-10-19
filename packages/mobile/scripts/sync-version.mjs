/**
 * Sync the mobile version from the single source of truth:
 * packages/app/package.json `version` (semver, e.g. 0.1.0).
 *
 * Writes:
 * - packages/mobile/package.json `version`
 * - iOS  App.xcodeproj  MARKETING_VERSION (= semver) and
 *   CURRENT_PROJECT_VERSION (= numeric build code)
 * - Android build.gradle versionName (= semver) and versionCode (= build code)
 *
 * Build code derivation: MAJOR*10000 + MINOR*100 + PATCH (0.1.0 -> 100).
 * Monotonic as long as semver increases — matches store requirements
 * (Android versionCode and iOS build number must always go up).
 *
 * Usage: npm run mobile:version   (runs from the repo root)
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const appPkgPath = join(root, 'packages', 'app', 'package.json')
const mobilePkgPath = join(root, 'packages', 'mobile', 'package.json')
const pbxprojPath = join(root, 'packages', 'mobile', 'ios', 'App', 'App.xcodeproj', 'project.pbxproj')
const gradlePath = join(root, 'packages', 'mobile', 'android', 'app', 'build.gradle')

const appPkg = JSON.parse(readFileSync(appPkgPath, 'utf8'))
const version = appPkg.version
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`[mobile:version] packages/app version "${version}" is not x.y.z — aborting`)
  process.exit(1)
}
const [major, minor, patch] = version.split('.').map(Number)
const buildCode = major * 10000 + minor * 100 + patch

// 1. packages/mobile/package.json
const mobilePkg = JSON.parse(readFileSync(mobilePkgPath, 'utf8'))
mobilePkg.version = version
writeFileSync(mobilePkgPath, JSON.stringify(mobilePkg, null, 2) + '\n')
console.log(`[mobile:version] mobile package.json -> ${version}`)

// 2. iOS project.pbxproj (all build configurations)
let pbx = readFileSync(pbxprojPath, 'utf8')
if (!/MARKETING_VERSION = [^;]+;/.test(pbx) || !/CURRENT_PROJECT_VERSION = [^;]+;/.test(pbx)) {
  console.error('[mobile:version] MARKETING_VERSION entries not found in project.pbxproj — aborting')
  process.exit(1)
}
pbx = pbx.replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`)
pbx = pbx.replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${buildCode};`)
writeFileSync(pbxprojPath, pbx)
console.log(`[mobile:version] iOS MARKETING_VERSION=${version} CURRENT_PROJECT_VERSION=${buildCode}`)

// 3. Android build.gradle
let gradle = readFileSync(gradlePath, 'utf8')
if (!/versionCode \d+/.test(gradle) || !/versionName "[^"]+"/.test(gradle)) {
  console.error('[mobile:version] versionCode/versionName not found in build.gradle — aborting')
  process.exit(1)
}
gradle = gradle.replace(/versionCode \d+/, `versionCode ${buildCode}`)
gradle = gradle.replace(/versionName "[^"]+"/, `versionName "${version}"`)
writeFileSync(gradlePath, gradle)
console.log(`[mobile:version] Android versionName="${version}" versionCode=${buildCode}`)

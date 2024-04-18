import dedent from 'dedent'
import { promises as fs } from 'fs'
import path from 'path'
import {
  defineCliApp,
  getPackageJson,
  isFileExists,
  log,
  setPackageJsonDataItem,
  spawn,
  validateOrThrow,
} from 'svag-cli-utils'
import z from 'zod'

defineCliApp(async ({ cwd, command, flags, argr }) => {
  const { packageJsonDir, packageJsonPath } = await getPackageJson({ cwd })

  const createConfigFile = async () => {
    log.green('Creating prettier config file...')
    const configPath = path.resolve(packageJsonDir, '.prettierrc.js')
    const { fileExists: configExists } = await isFileExists({ filePath: configPath })
    if (configExists) {
      log.toMemory.black(`${configPath}: prettier config file already exists`)
      return
    }
    const configName = validateOrThrow({
      zod: z.enum(['base']),
      text: 'Invalid config name',
      data: flags.config || flags.c || 'base',
    })

    const configContent = dedent`/** @type {import("prettier").Config} */
    module.exports = {
      ...require('svag-prettier/configs/${configName}'),
    }
    `
    await fs.writeFile(configPath, configContent + '\n')
    log.toMemory.black(`${configPath}: prettier config file created`)
  }

  const createIgnoreFile = async () => {
    log.green('Creating prettier ignore file...')
    const projectIgnorePath = path.resolve(packageJsonDir, '.prettierignore')
    const { fileExists: projectIgnoreExists } = await isFileExists({ filePath: projectIgnorePath })
    if (projectIgnoreExists) {
      log.toMemory.black(`${projectIgnorePath}: prettier ignore file already exists`)
      return
    }

    const srcIgnorePath = path.resolve(__dirname, '../.prettierignore')
    const ignoreContent = await fs.readFile(srcIgnorePath, 'utf-8')
    await fs.writeFile(projectIgnorePath, ignoreContent)
    log.toMemory.black(`${projectIgnorePath}: prettier ignore file created`)
  }

  const installDeps = async () => {
    log.green('Installing dependencies...')
    await spawn({ cwd: packageJsonDir, command: 'pnpm i -D svag-prettier@latest prettier' })
    log.toMemory.black(`${packageJsonPath}: dependencies installed`)
  }

  const addScriptToPackageJson = async () => {
    log.green('Adding "prettify" script to package.json...')
    const { packageJsonData, packageJsonPath } = await getPackageJson({ cwd: packageJsonDir })
    if (!packageJsonData.scripts?.prettify) {
      await setPackageJsonDataItem({ cwd: packageJsonDir, key: 'scripts.prettify', value: 'svag-prettier prettify' })
      log.toMemory.black(`${packageJsonPath}: script "prettify" added`)
    } else {
      log.toMemory.black(`${packageJsonPath}: script "prettify" already exists`)
    }
  }

  switch (command) {
    case 'create-config-file': {
      await createConfigFile()
      break
    }
    case 'create-ignore-file': {
      await createIgnoreFile()
      break
    }
    case 'install-deps': {
      await installDeps()
      break
    }
    case 'add-script-to-package-json': {
      await addScriptToPackageJson()
      break
    }
    case 'init': {
      await installDeps()
      await createConfigFile()
      await createIgnoreFile()
      await addScriptToPackageJson()
      break
    }
    case 'prettify': {
      await spawn({
        cwd: packageJsonDir,
        command: `pnpm prettier --log-level warn --cache --write "./**/*.{ts,tsx,js,json,yml,scss}" ${argr.join(' ')}`,
        exitOnFailure: true,
      })
      break
    }
    case 'h': {
      log.black(dedent`Commands:
        install-deps
        create-config-file
        add-script-to-package-json
        init — all above together
        prettify — prettier ...
      `)
      break
    }
    case 'ping': {
      await spawn({ cwd: packageJsonDir, command: 'echo pong' })
      break
    }
    default: {
      log.red('Unknown command:', command)
      break
    }
  }
})
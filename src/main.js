import chalk from 'chalk';
import execa from 'execa';
import fs from 'fs';
import gitignore from 'gitignore';
import Listr from 'listr';
import ncp from 'ncp';
import path from 'path';
import { projectInstall } from 'pkg-install';
import license from 'spdx-license-list/licenses/MIT';
import { promisify } from 'util';

const access = promisify(fs.access);
const writeFile = promisify(fs.writeFile);
const copy = promisify(ncp);
const writeGitignore = promisify(gitignore.writeFile);

async function copyTemplateFiles(options) {
  return copy(options.templateDirectory, options.targetDirectory, {
    clobber: false,
  });
}

async function createGitignore(options) {
  const file = fs.createWriteStream(
    path.join(options.targetDirectory, '.gitignore'),
    { flags: 'a' }
  );
  return writeGitignore({
    type: 'Node',
    file: file,
  });
}

async function createLicense(options) {
  const targetPath = path.join(options.targetDirectory, 'LICENSE');
  const licenseContent = license.licenseText
    .replace('<year>', new Date().getFullYear())
    .replace('<copyright holders>', `${options.name} (${options.email})`);
  return writeFile(targetPath, licenseContent, 'utf8');
}

async function initGit(options) {
  const result = await execa('git', ['init'], {
    cwd: options.targetDirectory,
  });
  if (result.failed) {
    return Promise.reject(new Error('Failed to initialize git'));
  }
  return;
}

export async function createProject(options) {
  options = {
    ...options,
    targetDirectory: options.targetDirectory || process.cwd(),
    email: 'hi@dominik.dev',
    name: 'Dominik Kundel',
  };

  const templateDir = path.resolve(
    new URL(import.meta.url).pathname,
    '../../templates',
    options.template
  );
  options.templateDirectory = templateDir;

  try {
    await access(templateDir, fs.constants.R_OK);
  } catch (err) {
    console.error('%s Invalid template name', chalk.red.bold('ERROR'));
    process.exit(1);
  }

  const tasks = new Listr(
    [
      {
        title: 'Copy project files',
        task: () => copyTemplateFiles(options),
      },
      {
        title: 'Create gitignore',
        task: () => createGitignore(options),
      },
      {
        title: 'Create License',
        task: () => createLicense(options),
      },
      {
        title: 'Initialize git',
        task: () => initGit(options),
        enabled: () => options.git,
      },
      {
        title: 'Install dependencies',
        task: () =>
          projectInstall({
            cwd: options.targetDirectory,
          }),
        skip: () =>
          !options.runInstall
            ? 'Pass --install to automatically install dependencies'
            : undefined,
      },
    ],
    {
      exitOnError: false,
    }
  );

  await tasks.run();
  console.log('%s Project ready', chalk.green.bold('DONE'));
  return true;
}

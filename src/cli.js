import arg from 'arg';
import inquirer from 'inquirer';
import { createProject } from './main';

function parseArgumentsIntoOptions(rawArgs) {
  const args = arg(
    {
      '--git': Boolean,
      '--yes': Boolean,
      '--install': Boolean,
      '-g': '--git',
      '-y': '--yes',
      '-i': '--install',
    },
    {
      argv: rawArgs.slice(2),
    }
  );
  return {
    skipPrompts: args['--yes'] || false,
    git: args['--git'] || false,
    template: args._[0],
    runInstall: args['--install'] || false,
  };
}

async function promptForMissingOptions(options) {
  const defaultTemplate = 'javascript';
  if (options.skipPrompts) {
    return {
      ...options,
      template: options.template || defaultTemplate,
    };
  }

  const questions = [];
  if (!options.template) {
    questions.push({
      type: 'list',
      name: 'template',
      message: 'Please choose which project template to use',
      choices: ['javascript', 'typescript'],
      default: defaultTemplate,
    });
  }

  if (!options.git) {
    questions.push({
      type: 'confirm',
      name: 'git',
      message: 'Should a git be initialized?',
      default: false,
    });
  }

  const answers = await inquirer.prompt(questions);
  return {
    ...options,
    template: options.template || answers.template,
    git: options.git || answers.git,
  };
}

export async function cli(args) {
  let options = parseArgumentsIntoOptions(args);
  options = await promptForMissingOptions(options);
  await createProject(options);
}

// ...

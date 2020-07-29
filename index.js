import {
  getInput, setOutput, setFailed, exportVariable, info, warning, startGroup, endGroup, group,
} from '@actions/core';
import { context } from '@actions/github';
import { execSync } from 'child_process';
import { parse as parseJson } from 'json5';

const release = require('release-it');

const event = context.payload;
const githubToken = getInput('github-token');
const autoResolveCommand = getInput('auto-resolve-command') || '';
const githubUsername = getInput('github-username');
const remoteRepo = `https://${githubUsername}:${githubToken}@github.com/${process.env.GITHUB_REPOSITORY}.git`;
const gitUserName = getInput('git-user-name');
const gitUserEmail = getInput('git-user-email') || process.env.GITHUB_EMAIL;
const createBranch = getInput('create-branch') || '';

let jsonOpts = {};

try {
  jsonOpts = parseJson(getInput('json-opts'));
} catch (error) {
  setFailed(`Failed to parse jsonOpts ${error.message}`);
}

if (!event.commits) {
  warning('No commits in event.');
}

info(`Firing from ${context.eventName} on ${context.ref}`);

try {
  startGroup('Git configuration');
  info(`Setting git user to ${gitUserName}`);
  execSync(`git config user.name ${gitUserName}`);

  info(`Setting git email to ${gitUserEmail}`);
  execSync(`git config user.email "${gitUserEmail}"`);

  info(`Setting git remote to ${remoteRepo}`);
  execSync(`git remote set-url origin ${remoteRepo}`);
  endGroup();

  startGroup('Git branching');
  if (context.ref === `refs/heads/${createBranch}`) {
    // TODO: Rebase onto another branch if a rebase option is selected

  } else if (createBranch.trim() !== '') {
    // TODO: [RIT-38] If --dry-run, output what we would do, don't do it
    if (execSync(`git ls-remote --heads ${remoteRepo} ${createBranch}`).toString()) {
      info(`Checking out remote branch ${createBranch}`);
      execSync(`git checkout --track origin/${createBranch}`);

      // TODO: [RIT-37] Add option to merge instead of rebase?
      info(`Rebasing onto ${context.ref}`);
      if (autoResolveCommand.trim() !== '') {
        try {
          execSync(`git rebase ${context.ref}`);
        } catch (error) {
          if (error.code !== 0) {
            execSync(autoResolveCommand);
            execSync('git rebase --continue');
          }
        }
      } else {
        execSync(`git rebase ${context.ref}`);
      }
      info(`Force pushing update to ${createBranch}`);
      execSync('git push --force');
    } else {
      info(`Creating branch ${createBranch}`);
      execSync(`git checkout -b ${createBranch}`);
      info('Setting upstream to origin');
      execSync(`git push -u origin ${createBranch}`);
    }
  } else {
    info('Nothing to do');
  }
  endGroup();

  exportVariable('GITHUB_TOKEN', githubToken);

  group('release-it', async () => {
    const response = await release(jsonOpts)
      .then((output) => {
        setOutput('json-result', output);
      })
      .catch((error) => {
        setFailed(error.message);
      });
    return response;
  });
} catch (error) {
  setFailed(error.message);
}

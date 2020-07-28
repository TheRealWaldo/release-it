import {
  getInput, setOutput, setFailed, exportVariable, info, warning, startGroup, endGroup,
} from '@actions/core';
import { context } from '@actions/github';
import { execSync } from 'child_process';
import { parse as parseJson } from 'json5';

const release = require('release-it');

const event = context.payload;
const githubToken = getInput('github-token');
const remoteRepo = `https://${process.env.GITHUB_ACTOR}:${githubToken}@github.com/${process.env.GITHUB_REPOSITORY}.git`;
const gitUserName = getInput('git-user-name');
const gitUserEmail = getInput('git-user-email') || process.env.GITHUB_EMAIL;
const createBranch = getInput('create-branch') || '';

let jsonOpts = {};

try {
  jsonOpts = parseJson(getInput('json-opts'));
} catch (error) {
  setFailed('Failed to parse jsonOpts', error.message);
}

if (!event.commits) {
  warning('No commits in event.');
}

info('Firing from', context.eventName, 'on', context.ref);

try {
  startGroup('Git configuration');
  info('Setting git user.');
  execSync(`git config user.name ${gitUserName}`);

  info('Setting git email.');
  execSync(`git config user.email "${gitUserEmail}"`);

  info('Setting git remote.');
  execSync(`git remote set-url origin ${remoteRepo}`);
  endGroup();

  if (createBranch.trim() !== '') {
    startGroup('Git branching');
    if (execSync(`git ls-remote --heads ${remoteRepo} ${createBranch}`).toString()) {
      info('Checking out remote branch', createBranch);
      execSync(`git checkout --track origin/${createBranch}`);
      // TODO: Now we have to rebase the branch onto our original branch

      // TODO: Update release-it options to force push on completion, if push is done
    } else {
      info('Creating branch', createBranch);
      execSync(`git checkout -b ${createBranch}`);
      info('Setting upstream.');
      execSync(`git push -u origin ${createBranch}`);
    }
    endGroup();
  }

  exportVariable('GITHUB_TOKEN', githubToken);
  startGroup('release-it');
  release(jsonOpts)
    .then((output) => {
      setOutput('json-result', output);
    })
    .catch((error) => {
      setFailed(error.message);
    });
  endGroup();
} catch (error) {
  setFailed(error.message);
}

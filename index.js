import {
  getInput, setOutput, setFailed, exportVariable, info,
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
  setFailed(error.message);
}

if (!event.commits) {
  info('No commits in event.');
}

try {
  info('Setting git user.');
  execSync(`git config user.name ${gitUserName}`);

  info('Setting git email.');
  execSync(`git config user.email "${gitUserEmail}"`);

  info('Setting git remote.');
  execSync(`git remote set-url origin ${remoteRepo}`);

  if (createBranch.trim() !== '') {
    info('Creating branch', createBranch);
    execSync(`git checkout -b ${createBranch}`);
    info('Setting upstream.');
    execSync(`git push -u origin ${createBranch}`);
  }

  exportVariable('GITHUB_TOKEN', githubToken);
  info('Running release-it.');
  release(jsonOpts)
    .then((output) => {
      setOutput('json-result', output);
    })
    .catch((error) => {
      setFailed(error.message);
    });
} catch (error) {
  setFailed(error.message);
}

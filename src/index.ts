import {
  getInput,
  setOutput,
  setFailed,
  exportVariable,
  info,
  warning,
  startGroup,
  endGroup,
  group,
} from '@actions/core';
import { context } from '@actions/github';
import { execSync } from 'child_process';
import { parse as parseJson } from 'json5';

import { runTasks, options } from 'release-it';

const event = context.payload;

if (!event.commits) {
  warning('No commits in event.');
}

info(`Firing from ${context.eventName} on ${context.ref}`);

function rebase(baseRef: string) {
  const autoResolveCommand = getInput('auto-resolve-command') || '';
  try {
    info(`Rebasing onto ${baseRef}`);
    execSync(`git rebase ${baseRef} --empty=drop`);
  } catch (error) {
    if (error.code !== 0) {
      if (autoResolveCommand !== '') {
        info('Attempting to auto resolve conflict');
        execSync(autoResolveCommand);
        info('Continuing rebase');
        execSync('GIT_EDITOR=true git rebase --continue');
      } else {
        execSync('git rebase --abort');
        error('Rebase failed');
      }
    }
  }
}

try {
  const githubToken = getInput('github-token', { required: true });
  const githubUsername = getInput('github-username', { required: true });
  const remoteRepo = `https://${githubUsername}:${githubToken}@github.com/${process.env.GITHUB_REPOSITORY}.git`;
  const gitUserName = getInput('git-user-name', { required: true });
  const gitUserEmail = getInput('git-user-email') || process.env.GITHUB_EMAIL;
  const createBranch = getInput('create-branch') || '';
  const contextBranch = context.ref.split('/')[2];
  const rebaseOnto = getInput('rebase-onto') || contextBranch;
  const noIncrement = getInput('no-increment') === 'true';

  let remoteBranchExists: string;

  const jsonOpts: options = parseJson(getInput('json-opts'));
  if (noIncrement) {
    info('Setting increment to false');
    jsonOpts.increment = false;
  }

  exportVariable('GITHUB_TOKEN', githubToken);

  startGroup('Git configuration');
  info(`Setting git user to ${gitUserName}`);
  execSync(`git config user.name ${gitUserName}`);

  info(`Setting git email to ${gitUserEmail}`);
  execSync(`git config user.email "${gitUserEmail}"`);

  info(`Setting git remote to ${remoteRepo}`);
  execSync(`git remote set-url origin ${remoteRepo}`);
  endGroup();

  startGroup('Git branching');
  if (contextBranch === createBranch) {
    if (rebaseOnto !== contextBranch) {
      rebase(`origin/${rebaseOnto}`);
    }
  } else if (createBranch !== '') {
    // TODO: [RIT-38] If --dry-run, output what we would do, don't do it
    jsonOpts.git.requireUpstream = false;
    info('Checking if remote branch exists');
    remoteBranchExists = execSync(`git ls-remote --heads ${remoteRepo} ${createBranch}`).toString();
    if (remoteBranchExists) {
      info(`Branch does not yet exist, creating branch ${createBranch}`);
      execSync(`git checkout -b ${createBranch}`);
    } else {
      execSync('git checkout -b temp-branch');
      info('Branch exists on remote, disabling push on release-it to do rebase post bump');
      jsonOpts.git.push = false;
    }
  } else {
    info('No branching to do');
  }
  endGroup();

  group('release-it', async () => {
    const response = await runTasks(jsonOpts);

    setOutput('json-result', response);
    setOutput('version', response.version);
    setOutput('latestVersion', response.latestVersion);
    setOutput('changelog', response.changelog);

    if (remoteBranchExists) {
      info(`Checking out remote branch ${createBranch}`);
      execSync(`git checkout --track origin/${createBranch}`);

      // TODO: [RIT-37] Add option to merge instead of rebase?
      rebase('temp-branch');

      info(`Force pushing update to ${createBranch}`);
      execSync(`git push "${remoteRepo}" --force`);
    }

    // TODO: Automatically create pull-request if branched
    // TODO: Automatically update pull-request (title especially) if already exists
  });
} catch (error) {
  setFailed(error.message);
}

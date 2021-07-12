import {
  getInput, setOutput, setFailed, exportVariable, info, warning, startGroup, endGroup, group,
} from '@actions/core';
import { context } from '@actions/github';
import { execSync } from 'child_process';
import { parse as parseJson } from 'json5';
import { PluginManager } from 'live-plugin-manager';

const release = require('release-it');

const manager = new PluginManager();

const event = context.payload;
const githubToken = getInput('github-token');

const githubUsername = getInput('github-username');
const remoteRepo = `https://${githubUsername}:${githubToken}@github.com/${process.env.GITHUB_REPOSITORY}.git`;
const gitUserName = getInput('git-user-name');
const gitUserEmail = getInput('git-user-email') || process.env.GITHUB_EMAIL;
const createBranch = getInput('create-branch') || '';
const contextBranch = context.ref.split('/')[2];
const rebaseOnto = getInput('rebase-onto') || contextBranch;
const noIncrement = (getInput('no-increment') === 'true');

// TODO: Read .release-it.json plugins and install them with --no-save

async function run() {
  await manager.install('@nodelib/fs.stat');
  await manager.install('@release-it/bumper');
  await manager.install('@release-it/conventional-changelog');
  await manager.require('@nodelib/fs.stat');
  await manager.require('@release-it/bumper');
  await manager.require('@release-it/conventional-changelog');

  let jsonOpts = {};

  try {
    jsonOpts = parseJson(getInput('json-opts'));
  } catch (error) {
    setFailed(`Failed to parse jsonOpts ${error.message}`);
  }

  jsonOpts.ci = true;
  if (noIncrement) {
    info('Setting increment to false');
    jsonOpts.increment = false;
  }

  if (!event.commits) {
    warning('No commits in event.');
  }

  info(`Firing from ${context.eventName} on ${context.ref}`);

  function rebase(baseRef) {
    const autoResolveCommand = getInput('auto-resolve-command') || '';
    try {
      info(`Rebasing onto origin/${baseRef}`);
      execSync(`git rebase origin/${baseRef}`);
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
        rebase(rebaseOnto);
      }
    } else if (createBranch !== '') {
      // TODO: [RIT-38] If --dry-run, output what we would do, don't do it
      info('Checking if remote branch exists');
      if (execSync(`git ls-remote --heads ${remoteRepo} ${createBranch}`).toString()) {
        info(`Checking out remote branch ${createBranch}`);
        execSync(`git checkout --track origin/${createBranch}`);

        // TODO: [RIT-37] Add option to merge instead of rebase?
        rebase(rebaseOnto);
        info(`Force pushing update to ${createBranch}`);
        execSync(`git push "${remoteRepo}" --force`);
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
          setOutput('version', output.version);
          setOutput('latestVersion', output.latestVersion);
          setOutput('changelog', output.changelog);
        })
        .catch((error) => {
          setFailed(error.message);
        });
      return response;
    });

    // TODO: Automatically create pull-request if branched
    // TODO: Automatically update pull-request (title especially) if already exists
  } catch (error) {
    setFailed(error.message);
  }
}

run();

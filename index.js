import { getInput, setOutput, setFailed } from "@actions/core";
import { context } from "@actions/github";
import { execSync } from "child_process";
import { parse as parseJson } from "json5";

const release = require("release-it");

const event = context.payload;
const remoteRepo = `https://${process.env.GITHUB_ACTOR}:${process.env.GITHUB_TOKEN}@github.com/${process.env.GITHUB_REPOSITORY}.git`;
const gitUserName = getInput("git-user-name") || "release-it bump";
const gitUserEmail = getInput("git-user-email") || process.env.GITHUB_EMAIL;

let jsonOpts = {};

try {
  jsonOpts = parseJson(getInput("json-opts") || "{}");
} catch (error) {
  setFailed(error.message);
}

if (!event.commits) {
  console.log("No commits in event.");
}

try {
  console.log("Setting git user.");
  execSync(`git config user.name ${gitUserName}`);

  console.log("Setting git email.");
  execSync(`git config user.email "${gitUserEmail}"`);

  const currentBranch = /refs\/[a-zA-Z]+\/(.*)/.exec(process.env.GITHUB_REF)[1];
  console.log("Checking out", currentBranch);
  execSync(`git checkout ${currentBranch}`);

  console.log("Setting git remote.");
  execSync(`git remote set-url origin ${remoteRepo}`);

  console.log("Running release-it.");
  release(jsonOpts)
    .then((output) => {
      setOutput("json-result", output);
    })
    .catch((error) => {
      setFailed(error.message);
    });
} catch (error) {
  setFailed(error.message);
}

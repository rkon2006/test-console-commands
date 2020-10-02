const spawn = require("child_process").spawn;
const fs = require("fs");

const defaultConfig = {
  execOptions: {},
  logProcess: true,
};

function execGitCmd(args, cmdConfig) {
  return new Promise((resolve, reject) => {
    if (!args.length) {
      reject("No arguments were given");
    }

    cmdConfig = { ...defaultConfig, ...cmdConfig };

    if (cmdConfig.logProcess) {
      const message = cmdConfig.customMsg
        ? `${cmdConfig.customMsg}...`
        : `git ${args[0]} is executing...`;
      console.log("\x1b[36m%s\x1b[0m", message);
    }

    const commandExecuter = spawn("git", args, cmdConfig.execOptions);
    let stdOutData = "";
    let stderrData = "";

    commandExecuter.stdout.on("data", (data) => (stdOutData += data));
    commandExecuter.stderr.on("data", (data) => (stderrData += data));
    commandExecuter.on("close", (code) =>
      code !== 0
        ? reject(stderrData.toString())
        : resolve(stdOutData.toString())
    );
  });
}

function asyncReadFs(path, encoding, cb) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, encoding, function (err, data) {
      if (err) {
        console.log(err);

        reject(err);

        if (typeof cb === "function") {
          cb(err);
        }

        return;
      }

      console.log(data);

      resolve(data);
      if (typeof cb === "function") {
        cb(data);
      }

      return;
    });
  });
}

function asyncWriteFs(fileName, data, cb) {
  return new Promise((resolve, reject) => {
    fs.writeFile(fileName, data, (err) => {
      if (err) throw err;

      if (typeof cb === "function") {
        cb(err);
      }

      console.log("The file has been saved!");
    });
  });
}

async function checkStatus() {
  await execGitCmd(["status"])
    .then(() => execGitCmd(["add", "package.json"]))
    .then(() => execGitCmd(["status"]))
    .then(() => execGitCmd(["commit", "-m", '"Some dummy commit desc']))
    .then(() => execGitCmd(["status"]))
    .then(console.log);
}

function switchToMaster() {
  return execGitCmd(["checkout", "master"])
    .then(() => execGitCmd(["pull", "origin", "master"]))
    .then(() => execGitCmd(["status"]))
    .then(console.log)
    .catch(console.error);
}

function createNewReleaseBranch(version) {
  return execGitCmd(["checkout", "-b", version])
    .then(() => execGitCmd(["status"]))
    .then(console.log)
    .catch(console.error);
}

function commitAndPushBranch(version) {
  return execGitCmd(["add", "-A"])
    .then(() =>
      execGitCmd([
        "commit",
        "-am",
        `Bumped version in package.json to ${version}`,
      ])
    )
    .then(() => execGitCmd(["push", "-u", "origin", version]))
    .then(() => execGitCmd(["status"]))
    .then(console.log)
    .catch(console.error);
}

async function updatePackageJson() {
  let fileString;

  try {
    fileString = await asyncReadFs("./package.json", "utf8");
  } catch (e) {
    console.error(e);
  }

  if (!file) {
    console.warn("Could not read package.json file");
    return;
  }

  const packageJson = JSON.parse(fileString);
  const currentVersion = packageJson.version;
  const nextLastPart = Number(packageJson.version.split(".")[2]) + 1;
  const nextVersion = `${currentVersion
    .split(".")
    .slice(0, 2)
    .join(".")}.${nextLastPart}`;

  packageJson.version = nextVersion;

  return packageJson;
}

async function writeUpdatedPackageJson(data) {
  try {
    await asyncWriteFs("./package.json", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}
async function raiseVersion() {
  await switchToMaster();

  console.log("Switched to master and pulled the recent state");

  const packageJson =  await updatePackageJson();

  await createNewReleaseBranch(packageJson.version);

  await writeUpdatedPackageJson(packageJson);

  console.log("Saved changes in package.json file");
  console.log("Now pushing a new branch into GitHub...");

  await commitAndPushBranch(packageJson.version);
}

// checkStatus();
raiseVersion();

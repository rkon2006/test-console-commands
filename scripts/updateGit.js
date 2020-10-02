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
async function raiseVersion() {
  await execGitCmd(["checkout", "master"])
    .then(() => execGitCmd(["pull", "origin", "master"]))
    .then(() => execGitCmd(["pull", "origin", "master"]))
    .catch(console.error);

  console.log("Switched to master and pulled the recent state");

  let file;

  try {
    file = await asyncReadFs("./package.json", "utf8");
  } catch (e) {
    console.error(e);
  }

  if (!file) {
    console.warn("Could not read package.json file");
    return;
  }

  const packageJson = JSON.parse(file);
  const currentVersion = packageJson.version;
  const nextLastPart = Number(packageJson.version.split(".")[2]) + 1;
  const nextVersion = `${currentVersion
    .split(".")
    .slice(0, 2)
    .join(".")}.${nextLastPart}`;

  packageJson.version = nextVersion;

  await execGitCmd(["checkout", "-b", nextVersion])
    .then(() => execGitCmd(["status"]))
    .then(console.log)
    .catch(console.error);

  try {
    await asyncWriteFs("./package.json", JSON.stringify(packageJson, null, 2));
  } catch (e) {
    console.error(e);
  }

  console.log('Saved changes in package.json file');
  console.log('Now pushing a new branch into GitHub...');
  await execGitCmd(['add', '-A'])
    .then(() => execGitCmd(["commit", "-am", `Bumped version in package.json to ${nextVersion}`]))
    .then(() => execGitCmd(["push", "-u", "origin", nextVersion]))
    .then(() => execGitCmd(["status"]))
    .then(console.log)
    .catch(console.error);
  console.log("bbb file", file);
  console.log("bbb raiseVersion is called", { nextVersion, packageJson });
  // execGitCmd(['init'])
  //   .then(() => execGitCmd(['add', '-A']))
  //   .then(() => execGitCmd(['commit', '-m', '"first commit"']))
  //   .then(() => execGitCmd(['status']))
  //   .then(console.log)
  //   .catch(console.error)
}

raiseVersion();

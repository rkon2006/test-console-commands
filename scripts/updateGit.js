const {
  switchToMaster,
  updatePackageJson,
  createNewReleaseBranch,
  writeUpdatedPackageJson,
  commitAndPushBranch,
} = require("./helpers");

async function raiseVersion() {
  await switchToMaster();

  console.log("Switched to master and pulled the recent state");

  const packageJson = await updatePackageJson();

  await createNewReleaseBranch(packageJson.version);

  await writeUpdatedPackageJson(packageJson);

  console.log("Saved changes in package.json file");
  console.log("Now pushing a new branch into GitHub...");

  await commitAndPushBranch(packageJson.version);
}

// checkStatus();
raiseVersion();

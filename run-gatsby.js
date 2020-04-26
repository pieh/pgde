const path = require(`path`);
const Module = require(`module`);
const inspector = require("inspector");
const { kebabCase } = require("lodash");
const fs = require(`fs-extra`);
const onExit = require("signal-exit");
const runServer = require(`./view`);

const runGatsby = async ({
  activity,
  // viewer,
  profileEverything,
  clean,
  $0,
  _: gatsbyCmd,
  ...args
}) => {
  process.argv = [
    ...process.argv.slice(0, 2),
    ...gatsbyCmd,
    ...Object.entries(args).map(([key, value]) => {
      return `${key}=${value}`;
    }),
  ];

  // let getUrl;
  // if (viewer) {
  //   getUrl = (await runServer({ background: true })).getUrl;
  // }

  const createRequire = Module.createRequire || Module.createRequireFromPath;

  const localRequire = createRequire(path.join(process.cwd(), `package.json`));

  const gatsbyPath = localRequire.resolve(`gatsby`);
  const gatsbyRequire = createRequire(gatsbyPath);

  const reporter = gatsbyRequire(`gatsby-cli/lib/reporter`);

  const activityFilters = activity ? activity.split(`,`) : [];

  // const profileEverything = filters.length === 0;

  session = new inspector.Session();
  session.connect();

  // monkey-patch reporter
  const profileCounter = new Map();

  const saveProfile = (label, filename, profile, onExit) => {
    filename = kebabCase(filename);

    let number = profileCounter.get(filename) || 0;
    number++;

    let originalFileName = filename;

    if (number > 1) {
      filename = `${filename}-${number}`;
    }

    const fileNameWithExt = `${filename}.cpuprofile`;

    const filepath = path.join(
      process.cwd(),
      `./.cpuprofiles/${fileNameWithExt}`
    );
    fs.outputFileSync(filepath, JSON.stringify(profile));

    profileCounter.set(originalFileName, number);

    const log = (text) => {
      if (onExit) {
        process.stdout.write(`${text}\n`);
      } else {
        reporter.log(text);
      }
    };

    let out = `[pgde] saved cpu profile for ${label} in "${filepath}".`;
    // if (getUrl) {
    //   out += ` View: ${getUrl(fileNameWithExt)}`;
    // }

    log(out);
  };

  global.pgdeStart = (label) => {
    if (label) {
      reporter.info(`Profiling "${label}"`);
    }
    session.post("Profiler.start");
  };

  global.pgdeEnd = (label, filename = label) => {
    session.post("Profiler.stop", (err, { profile }) => {
      if (!err) {
        saveProfile(label, filename, profile);
      }
    });
  };

  const patchActivityMethod = (fn) => {
    return (text, ...rest) => {
      const shouldProfile = activityFilters.some((filter) => {
        return text.includes(filter);
      });

      let originalText = text;
      if (shouldProfile) {
        text = `[activity profiling] ${text}`;
      } else if (profileEverything) {
        text = `[profiling everything] ${text}`;
      }

      const activity = fn.call(reporter, text, ...rest);

      if (shouldProfile) {
        const originalStart = activity.start;
        const originalEnd = activity.end;
        const originalDone = activity.done;

        const wrapUpProfiling = () => {
          session.post("Profiler.stop", (err, { profile }) => {
            if (!err) {
              saveProfile(
                `"${originalText}" activity`,
                originalText,

                profile
              );
            }
          });
        };

        activity.start = () => {
          session.post("Profiler.start");
          originalStart.call(activity);
        };

        activity.end = () => {
          originalEnd.call(activity);
          wrapUpProfiling();
        };

        activity.done = () => {
          originalDone.call(activity);
          wrapUpProfiling();
        };
      }

      return activity;
    };
  };

  reporter.activityTimer = patchActivityMethod(reporter.activityTimer);
  reporter.createProgress = patchActivityMethod(reporter.createProgress);

  try {
    fs.emptyDirSync(`./.cpuprofiles`);
  } catch (e) {
    console.log("t", e);
  }

  if (clean) {
    const directories = [`.cache`, `public`];
    reporter.info(`Deleting ${directories.join(`, `)}`);

    try {
      directories.map((dir) => fs.removeSync(path.join(process.cwd(), dir)));
    } catch (e) {}
  }

  session.post("Profiler.enable", () => {
    const run = () => {
      localRequire(`./node_modules/.bin/gatsby`);
    };

    if (profileEverything) {
      session.post("Profiler.start", () => {
        onExit(() => {
          session.post("Profiler.stop", (err, { profile }) => {
            saveProfile("Session", "gatsby", profile, true);
          });
        });

        run();
      });
    } else {
      run();
    }
  });
};

module.exports = runGatsby;

const randomPort = require(`random-port`);
const fs = require(`fs`);
const path = require(`path`);
const open = require(`open`);
const prompts = require(`prompts`);

const express = require("express");

const runServer = ({ background = false } = {}) => {
  return new Promise((resolve) => {
    const timelineViewerDir = path.join(
      path.dirname(require.resolve(`timeline-viewer/package.json`)),
      "docs"
    );
    // console.log(timelineViewerDir);
    const app = express();

    const cpuProfileDir = path.join(process.cwd(), ".cpuprofiles");

    randomPort(async (port) => {
      const getUrl = (profile) =>
        `http://localhost:${port}/?loadTimelineFromURL=http://localhost:${port}/${profile}`;

      app.get(`/service-worker.js`, (req, res, next) => {
        res
          .status(404)
          .send("Well, that's one way to hackily disable service worker");
      });

      app.get("/", function (req, res, next) {
        // console.log("got it");

        if (req.query.loadTimelineFromURL) {
          next();
          return;
        }

        try {
          const cpuProfiles = fs.readdirSync(cpuProfileDir);

          res.send(
            `
            <html>
            <head><title>PGDE</title></head>
            <body>
            <ul>
            ${cpuProfiles
              .map((cpuProfileName) => {
                return `
              <li><a href="${getUrl(cpuProfileName)}">${cpuProfileName}</a></li>
              `;
              })
              .join(``)}
            </ul>
            </body>
            </html>
            `
          );
        } catch (e) {
          console.error("No .cpuprofiles directory");
          next();
        }
      });

      app.use(express.static(timelineViewerDir));
      app.use(express.static(cpuProfileDir));

      app.listen(port);

      if (!background) {
        // let cpuProfiles;
        // try {
        //   cpuProfiles = fs.readdirSync(cpuProfileDir);
        // } catch (e) {
        //   console.error("No .cpuprofiles directory");
        //   process.exit(1);
        // }

        // const { profile } = await prompts([
        //   {
        //     type: `select`,
        //     name: `profile`,
        //     message: `Which profile`,
        //     choices: cpuProfiles.map((file) => {
        //       return {
        //         title: file,
        //         value: file,
        //       };
        //     }),

        //     initial: 0,
        //   },
        // ]);

        // const url = open(getUrl(profile));
        console.log(`Listening on http://localhost:${port}/`);
      }

      resolve({ getUrl });
    });
  });
};

module.exports = runServer;

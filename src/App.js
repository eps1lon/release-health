import React from "react";
import {
  CircularProgress,
  Link,
  MenuItem,
  TextField,
  Typography
} from "@material-ui/core";
import PropTypes from "prop-types";
import * as semver from "semver";

export default function App() {
  const [library, dispatch] = React.useReducer(
    (state, action) => {
      const nextState = { ...state };
      switch (action.type) {
        case "name-change":
          nextState.name = action.payload;
          nextState.versionStart = "none";
          nextState.versionEnd = "none";
          nextState.versions = [];
          nextState.versionsState = "preflight";
          break;
        case "version-start-change":
          nextState.versionStart = action.payload;
          break;
        case "version-end-change":
          nextState.versionEnd = action.payload;
          break;
        case "fetching-versions":
          nextState.versionsState = "loading";
          break;
        case "fetched-versions":
          nextState.versionsState = "done";
          nextState.versions = action.payload;
          break;
        default:
          throw new TypeError(`unknown action '${action.type}'`);
      }

      return nextState;
    },
    {
      name: "@material-ui/core",
      versions: [],
      versionStart: "none",
      versionEnd: "none",
      versionsState: "done"
    }
  );

  React.useEffect(() => {
    dispatch({ type: "fetching-versions" });

    let current = true;

    const url = `https://test.cors.workers.dev/?https://registry.npmjs.org/${
      library.name
    }`;
    fetch(url, {
      mode: "cors"
    })
      .then(response => {
        return response.json();
      })
      .then(registry => {
        if (current === true) {
          // TODO error handling
          const versions = registry.versions
            ? Object.keys(registry.versions)
            : [];
          dispatch({
            type: "fetched-versions",
            payload: versions
          });
        }
      });

    return () => {
      current = false;
    };
  }, [library.name]);

  const versions = React.useMemo(() => {
    const range = `${library.versionStart} - ${library.versionEnd}`;

    if (semver.validRange(range) === null) {
      return [];
    }

    return library.versions.filter(version => {
      return semver.intersects(version, range);
    });
  }, [library.versionStart, library.versionEnd, library.versions]);

  const possibleVersions = React.useMemo(() => {
    return semver.rsort(library.versions);
  }, [library.versions]);

  return (
    <React.Fragment>
      <Typography variant="h1">release health</Typography>
      <Typography variant="body1">
        Displays health of releases by listing dependabot compatibility scores
      </Typography>
      <Typography variant="h2">package information</Typography>
      <div style={{ width: 60, height: 60 }}>
        {library.versionsState !== "done" && <CircularProgress />}
      </div>
      <TextField
        label="package name"
        onChange={event =>
          dispatch({ type: "name-change", payload: event.target.value })
        }
        value={library.name}
        variant="outlined"
      />
      <TextField
        label="version start"
        onChange={event => {
          dispatch({
            type: "version-start-change",
            payload: event.target.value
          });
        }}
        select
        style={{ minWdith: "10ch" }}
        value={library.versionStart}
        variant="outlined"
      >
        <MenuItem value="none">no version</MenuItem>
        {possibleVersions.map(version => {
          return (
            <MenuItem key={version} value={version}>
              {version}
            </MenuItem>
          );
        })}
      </TextField>
      <TextField
        label="version end"
        onChange={event => {
          dispatch({
            type: "version-end-change",
            payload: event.target.value
          });
        }}
        select
        style={{ minWdith: "10ch" }}
        value={library.versionEnd}
        variant="outlined"
      >
        <MenuItem value="none">no version</MenuItem>
        {possibleVersions.map(version => {
          return (
            <MenuItem key={version} value={version}>
              {version}
            </MenuItem>
          );
        })}
      </TextField>

      <Typography variant="h2">compatibility scores</Typography>
      <CompatibilityScrores name={library.name} versions={versions} />
      <Typography variant="h3">more information</Typography>
      <Link
        href={`https://dependabot.com/compatibility-score/?dependency-name=${
          library.name
        }&package-manager=npm_and_yarn&version-scheme=semver`}
      >
        Score overview
      </Link>
    </React.Fragment>
  );
}

function CompatibilityScrores({ name, versions }) {
  const ascendingVersions = React.useMemo(() => {
    return semver.sort(versions);
  }, [versions]);

  if (versions.length === 0 || name === "") {
    return <Typography>Enter a name and version range</Typography>;
  }

  return (
    <table>
      <tbody>
        <tr>
          <td />
          {ascendingVersions.map(version => {
            return <td key={version}>{version}</td>;
          })}
        </tr>
        {ascendingVersions.map(leftVersion => {
          return (
            <tr key={leftVersion}>
              <td>{leftVersion}</td>
              {ascendingVersions.map(rightVersion => {
                if (semver.lt(rightVersion, leftVersion)) {
                  return <td key={rightVersion} />;
                }
                return (
                  <td key={rightVersion}>
                    <Link
                      href={`https://dependabot.com/compatibility-score/?dependency-name=${name}&package-manager=npm_and_yarn&previous-version=${leftVersion}&new-version=${rightVersion}`}
                    >
                      <img
                        alt={`compatibility score of ${name} between version ${leftVersion} and ${rightVersion}`}
                        title={`${leftVersion} - ${rightVersion}`}
                        src={`https://api.dependabot.com/badges/compatibility_score?dependency-name=${name}&package-manager=npm_and_yarn&previous-version=${leftVersion}&new-version=${rightVersion}`}
                      />
                    </Link>
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
CompatibilityScrores.propTypes = {
  name: PropTypes.string.isRequired,
  versions: PropTypes.arrayOf(PropTypes.string).isRequired
};

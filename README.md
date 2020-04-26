# pgde

Utils to easier profile Gatsby builds

## Installation

Install globally

```
npm install -g @pieh/gde
```

Or use with `npx`

## Usage

Replace `gatsby` command with `pgde`:

`pgde build` or `pgde develop`

Without additional flags this will not produce anything. See options:

### Profile everything

`pgde build --full` / `pgde develop --full`

Will produce `.cpuprofile` for entire session in `<project_dir>/.cpuprofiles/gatsby.cpuprofile`

### Profile selected activities

`pgde build --activity="run queries"` / `pgde develop --activity="run queries"`

Will limit profiling only to time selected activities are active. You can pick multiple activies (comma separated) and you can just write subset of activity text:

```
pgde build --activity="run queries,source and"
```

### `--clean` flag

This is the same as running `gatsby clean` (just quality of life helper). Works with both `pgde build` and `pgde develop`

### Programmatic usage

You can use it in code (`pgde` adds few functions to global scope that are similar to `console.time` / `console.timeEnd` - not exactly)

```js
if (typeof pgdeStart !== `undefined`) {
  pgdeStart();
}

// code you want to profile [...]
// you can have start and end and completely different files (just it might break if you try end without starting profiling)

if (typeof pgdeEnd !== `undefined`) {
  // paramater will be used as name for .cpuprofile file
  pgdeEnd(`random`);
}
```

### Viewing profiles

You can use Chrome dev tools to load .cpuprofiles files or you can use `pgde` (no args) or `pgde view` (both commands do same thing) to run tiny webserver that will show list of profiles and after selecting one of them will present it in similar dev tools like viewer (using https://github.com/ChromeDevTools/timeline-viewer)

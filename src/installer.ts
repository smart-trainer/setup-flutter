import * as core from '@actions/core';
import * as http from '@actions/http-client';
import * as io from '@actions/io';
import * as tc from '@actions/tool-cache';
import * as fs from 'fs';
import * as path from 'path';

export const storageUrl =
  'https://storage.googleapis.com/flutter_infra/releases';

interface IFlutterData {
  channel: string;
  version: string;
  downloadUrl: string;
}

interface IFlutterChannel {
  [key: string]: string;
  beta: string;
  dev: string;
  stable: string;
}

interface IFlutterRelease {
  hash: string;
  channel: string;
  version: string;
  archive: string;
}

interface IFlutterReleaseJson {
  current_release: IFlutterChannel;
  releases: IFlutterRelease[];
}

export async function getFlutter(
  version: string,
  channel: string
): Promise<void> {
  const releasesUrl: string = `${storageUrl}/releases_macos.json`;
  const httpClient: http.HttpClient = new http.HttpClient('flutter-action');
  const json: IFlutterReleaseJson | null = (
    await httpClient.getJson<IFlutterReleaseJson | null>(releasesUrl)
  ).result;

  if (!json) {
    throw new Error('Failed to get flutter releases_macos.json');
  }

  let flutterData;
  if (version === '') {
    flutterData = await getLatestVersion(json, channel);
  } else {
    flutterData = await getVersion(json, channel, version);
  }

  let toolPath = tc.find('flutter', flutterData.version);
  if (toolPath) {
    core.debug(`Tool found in cache ${toolPath}`);
  } else {
    core.debug(
      `Downloading Flutter from Google storage ${flutterData.downloadUrl}`
    );

    const sdkFile = await tc.downloadTool(flutterData.downloadUrl);
    const sdkCache = await tmpDir();
    const sdkDir = await extract(
      sdkFile,
      sdkCache,
      path.basename(flutterData.downloadUrl)
    );

    toolPath = await tc.cacheDir(sdkDir, 'flutter', flutterData.version);
  }

  core.exportVariable('FLUTTER_ROOT', toolPath);
  core.addPath(path.join(toolPath, 'bin'));
  core.addPath(path.join(toolPath, 'bin', 'cache', 'dart-sdk', 'bin'));
}

async function tmpDir(): Promise<string> {
  const runnerTmp = process.env['RUNNER_TEMP'] || '';
  const baseDir = runnerTmp
    ? runnerTmp
    : path.join('/Users', 'actions', 'temp');
  const tempDir = path.join(
    baseDir,
    'temp_' + Math.floor(Math.random() * 2000000000)
  );

  await io.mkdirP(tempDir);
  return tempDir;
}

async function extract(
  sdkFile: string,
  sdkCache: string,
  originalFilename: string
): Promise<string> {
  const fileStats = fs.statSync(path.normalize(sdkFile));

  if (fileStats.isFile()) {
    const stats = fs.statSync(sdkFile);

    if (!stats) {
      throw new Error(`Failed to extract ${sdkFile} - it doesn't exist`);
    } else if (stats.isDirectory()) {
      throw new Error(`Failed to extract ${sdkFile} - it is a directory`);
    }

    if (originalFilename.endsWith('tar.xz')) {
      await tc.extractTar(sdkFile, sdkCache, 'x');
    } else {
      await tc.extractZip(sdkFile, sdkCache);
    }

    return path.join(sdkCache, fs.readdirSync(sdkCache)[0]);
  } else {
    throw new Error(`Flutter sdk argument ${sdkFile} is not a file`);
  }
}

async function getLatestVersion(
  storage: IFlutterReleaseJson,
  channel: string
): Promise<IFlutterData> {
  const release = storage.releases.find(release => {
    return (
      release.hash === storage.current_release[channel] &&
      release.channel === channel
    );
  });

  return getVersionData(release);
}

async function getVersion(
  storage: IFlutterReleaseJson,
  channel: string,
  version: string
): Promise<IFlutterData> {
  const release = storage.releases.find(release => {
    return release.version === version && release.channel === channel;
  });

  return getVersionData(release);
}

function getVersionData(release: IFlutterRelease | undefined) {
  if (!release) {
    throw new Error(`Unable get flutter version`);
  }

  core.debug(
    `latest version from channel ${release.channel} is ${release.version}`
  );

  const flutterData: IFlutterData = {
    channel: release.channel,
    version: release.version,
    downloadUrl: `${storageUrl}/${release.archive}`
  };

  return flutterData;
}

#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

function getLatestTag() {
  try {
    return execSync('git describe --tags --abbrev=0').toString().trim();
  } catch (error) {
    return '0.0.0';
  }
}

function getCommitsSinceTag(tag) {
  const format = '%s|%h|%an|%at';
  const command = `git log ${tag}..HEAD --pretty=format:"${format}"`;
  try {
    return execSync(command)
      .toString()
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(commit => {
        const [message, hash, author, timestamp] = commit.split('|');
        return { message, hash, author, timestamp: new Date(timestamp * 1000) };
      });
  } catch (error) {
    return [];
  }
}

function generateChangelog(commits) {
  const categories = {
    feat: '✨ Features',
    fix: '🐛 Bug Fixes',
    docs: '📚 Documentation',
    style: '💎 Code Style',
    refactor: '♻️ Refactoring',
    perf: '⚡️ Performance',
    test: '🚨 Tests',
    build: '🛠 Build System',
    ci: '⚙️ CI Configuration',
    chore: '📦 Chores',
    revert: '⏪️ Reverts'
  };

  const changes = {};
  Object.values(categories).forEach(cat => changes[cat] = []);
  changes['Other'] = [];

  commits.forEach(commit => {
    const { message, hash, author, timestamp } = commit;
    const match = message.match(/^(\w+)(\(.+\))?:/);
    
    const entry = `- ${message} ([${hash}](https://github.com/zhuzhuyule/sink-extension/commit/${hash})) - ${author}`;
    
    if (match && categories[match[1]]) {
      changes[categories[match[1]]].push(entry);
    } else {
      changes['Other'].push(entry);
    }
  });

  return Object.entries(changes)
    .filter(([_, items]) => items.length > 0)
    .map(([category, items]) => `### ${category}\n\n${items.join('\n')}`)
    .join('\n\n');
}

function updateVersion(type = 'patch') {
  const packagePath = path.join(rootDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const [major, minor, patch] = pkg.version.split('.').map(Number);
  
  let newVersion;
  switch (type) {
    case 'major':
      newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    default:
      newVersion = `${major}.${minor}.${patch + 1}`;
  }
  
  pkg.version = newVersion;
  fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
  return newVersion;
}

function main() {
  const versionType = process.argv[2] || 'patch';
  if (!['major', 'minor', 'patch'].includes(versionType)) {
    console.error('Version type must be: major, minor, or patch');
    process.exit(1);
  }

  const currentTag = getLatestTag();
  const commits = getCommitsSinceTag(currentTag);
  const newVersion = updateVersion(versionType);
  
  const date = new Date().toISOString().split('T')[0];
  const changelog = `# ${newVersion} (${date})\n\n${generateChangelog(commits)}`;
  
  // 更新 CHANGELOG.md
  const changelogPath = path.join(rootDir, 'CHANGELOG.md');
  const existingChangelog = fs.existsSync(changelogPath) 
    ? fs.readFileSync(changelogPath, 'utf8')
    : '';
  
  fs.writeFileSync(
    changelogPath,
    `${changelog}\n\n${existingChangelog}`.trim() + '\n'
  );
  
  console.log(`✅ Version updated to ${newVersion}`);
  console.log('✅ CHANGELOG.md updated');
  
  // 创建 git tag
  execSync(`git add package.json CHANGELOG.md`);
  execSync(`git commit -m "chore: release ${newVersion}"`);
  execSync(`git tag -a v${newVersion} -m "Release ${newVersion}"`);
  
  console.log('✅ Git tag created');
  console.log('\nRun following commands to push changes:');
  console.log(`git push && git push origin v${newVersion}`);
}

main(); 
